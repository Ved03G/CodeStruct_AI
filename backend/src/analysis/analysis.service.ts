import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import simpleGit from 'simple-git';
import { tmpdir } from 'os';
import { mkdtemp, readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';

@Injectable()
export class AnalysisService {
  private complexityThreshold = 10;

  constructor(private readonly prisma: PrismaService) {}

  async startAnalysis(gitUrl: string, language: string, userId?: number): Promise<number> {
    // Create project or reuse existing
    const project = await (this.prisma as any).project.upsert({
      where: { gitUrl },
      update: { status: 'Analyzing' },
      create: {
        name: this.deriveProjectName(gitUrl),
        gitUrl,
        language,
    status: 'Analyzing',
        user: userId
          ? { connect: { id: userId } }
          : { create: { email: `${Date.now()}@placeholder.local` } },
      },
    });

    // If we have a logged-in user and GitHub URL, attempt token-authenticated clone for private repos
    let effectiveUrl = gitUrl;
    if (userId && /github\.com/.test(gitUrl)) {
      try {
        const user = await (this.prisma as any).user.findUnique({ where: { id: userId } });
        const token: string | undefined = user?.githubAccessToken;
        if (token) {
          // https://x-access-token:<token>@github.com/owner/repo.git
          const encoded = encodeURIComponent(token);
          effectiveUrl = gitUrl.replace(/^https:\/\//, `https://x-access-token:${encoded}@`);
        }
      } catch {}
    }

    // Async fire-and-forget analysis (no queue for demo)
  this.analyzeRepo(effectiveUrl, language, project.id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Analysis failed', err);
    });

    return project.id;
  }

  private deriveProjectName(gitUrl: string) {
  if (!gitUrl) return 'project';
  const name = gitUrl.split('/').pop() || 'project';
    return name.replace(/\.git$/, '');
  }

  private async analyzeRepo(gitUrl: string, language: string, projectId: number) {
    let dir: string | undefined;
  try {
      dir = await mkdtemp(join(tmpdir(), 'codestruct-'));
      const git = simpleGit();
      await git.clone(gitUrl, dir);

      // Reset existing issues for re-run scenarios
      await (this.prisma as any).issue.deleteMany({ where: { projectId } });

  const files = await this.collectFiles(dir);

  // Global duplicate map across files
  const duplicateMap = new Map<string, { file: string; text: string }[]>();

      for (const file of files) {
      const code = await readFile(file, 'utf8');
      const ext = extname(file).toLowerCase();
      if (!this.supports(ext, language)) continue;
  let blocks: { start: number; end: number; text: string }[] = [];
  let astSucceeded = false;
  // Try AST first
  try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Parser = require('tree-sitter');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Ts = require('tree-sitter-typescript');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Py = require('tree-sitter-python');
        const parser = new Parser();
        const lang = language.toLowerCase();
        if (lang.includes('ts')) parser.setLanguage(Ts.typescript);
        else if (lang.includes('js')) parser.setLanguage(Ts.tsx);
        else if (lang.includes('py')) parser.setLanguage(Py);
        else parser.setLanguage(Ts.typescript);
        const tree = parser.parse(code);
        const fnTypes = ['function_declaration', 'method_definition', 'arrow_function', 'function', 'function_definition'];
        const nodes = this.queryNodes(tree, fnTypes);
        const complexitiesAst: number[] = [];
        blocks = nodes.map((node: any) => {
          const text = code.slice(node.startIndex, node.endIndex);
          const cpx = this.estimateCyclomaticComplexityAst(node, code);
          complexitiesAst.push(cpx);
          return { start: node.startIndex, end: node.endIndex, text };
        });

  // High complexity issues (AST-based)
        for (let i = 0; i < blocks.length; i++) {
          const complexity = complexitiesAst[i] ?? this.estimateCyclomaticComplexityFromText(blocks[i].text);
          if (complexity > this.complexityThreshold) {
            await (this.prisma as any).issue.create({
              data: {
                projectId,
                filePath: file,
                functionName: this.extractFunctionNameFromText(blocks[i].text, language),
                issueType: 'HighComplexity',
                metadata: { complexity },
                codeBlock: blocks[i].text,
              },
            });
          }
        }
        astSucceeded = true;
      } catch (e: any) {
        // Fallback extraction if AST not available
        blocks = this.extractBlocksFallback(code, language);
      }

      // High complexity issues (fallback, when AST path failed)
      if (!astSucceeded) {
        for (const b of blocks) {
          const complexity = this.estimateCyclomaticComplexityFromText(b.text);
          if (complexity > this.complexityThreshold) {
            await (this.prisma as any).issue.create({
              data: {
                projectId,
                filePath: file,
                functionName: this.extractFunctionNameFromText(b.text, language),
                issueType: 'HighComplexity',
                metadata: { complexity },
                codeBlock: b.text,
              },
            });
          }
        }
      }

      // Record blocks for global duplicate detection
      for (const b of blocks) {
        const normalized = this.normalizeAstLike(b.text);
        const hash = await this.hash(normalized);
        const arr = duplicateMap.get(hash) || [];
        arr.push({ file, text: b.text });
        duplicateMap.set(hash, arr);
      }

      // Magic numbers detection per block
      for (const b of blocks) {
        const magic = this.findMagicNumbers(b.text, language);
        for (const m of magic) {
          await (this.prisma as any).issue.create({
            data: {
              projectId,
              filePath: file,
              functionName: this.extractFunctionNameFromText(b.text, language),
              issueType: 'MagicNumber',
              metadata: { value: m.value, count: m.count },
              codeBlock: b.text,
            },
          });
        }
      }
  } // end for each file

      // Create duplicate issues across entire repo after scanning all files
      for (const [_, list] of duplicateMap.entries()) {
        if (list.length > 1) {
          for (const item of list) {
            await (this.prisma as any).issue.create({
              data: {
                projectId,
                filePath: item.file,
                functionName: this.extractFunctionNameFromText(item.text, language),
                issueType: 'DuplicateCode',
                metadata: { duplicates: list.length },
                codeBlock: item.text,
              },
            });
          }
        }
      }
      // Mark project completed
      await (this.prisma as any).project.update({ where: { id: projectId }, data: { status: 'Completed' } });
    } catch (e) {
      // Mark project failed
      try {
        await (this.prisma as any).project.update({ where: { id: projectId }, data: { status: 'Failed' } });
      } catch {}
      throw e;
    } finally {
      // Cleanup temp dir best-effort
      if (dir) {
        try {
          const { rm } = await import('fs/promises');
          await (rm as any)(dir, { recursive: true, force: true });
        } catch {}
      }
    }
  }

  // Quick analysis for CI: analyze changed files without persisting to DB
  async quickAnalyzeRepo(gitUrl: string, language: string, filesFilter?: string[]) {
    const dir = await mkdtemp(join(tmpdir(), 'codestruct-ci-'));
    const git = simpleGit();
    await git.clone(gitUrl, dir);
    const files = await this.collectFiles(dir);
    const targetFiles = filesFilter && filesFilter.length
      ? files.filter((f) => filesFilter.some((rel) => f.endsWith(rel)))
      : files;

    const issues: any[] = [];
    for (const file of targetFiles) {
      const code = await readFile(file, 'utf8');
      const ext = extname(file).toLowerCase();
      if (!this.supports(ext, language)) continue;
      let blocks: { start: number; end: number; text: string }[] = [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Parser = require('tree-sitter');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Ts = require('tree-sitter-typescript');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Py = require('tree-sitter-python');
        const parser = new Parser();
        const lang = language.toLowerCase();
        if (lang.includes('ts')) parser.setLanguage(Ts.typescript);
        else if (lang.includes('js')) parser.setLanguage(Ts.tsx);
        else if (lang.includes('py')) parser.setLanguage(Py);
        else parser.setLanguage(Ts.typescript);
        const tree = parser.parse(code);
        const fnTypes = ['function_declaration', 'method_definition', 'arrow_function', 'function', 'function_definition'];
        const nodes = this.queryNodes(tree, fnTypes);
        blocks = nodes.map((n: any) => ({ start: n.startIndex, end: n.endIndex, text: code.slice(n.startIndex, n.endIndex) }));
      } catch {
        blocks = this.extractBlocksFallback(code, language);
      }

      for (const b of blocks) {
        const complexity = this.estimateCyclomaticComplexityFromText(b.text);
        if (complexity > this.complexityThreshold) {
          issues.push({ filePath: file, issueType: 'HighComplexity', metadata: { complexity }, codeBlock: b.text });
        }
      }

      const map = new Map<string, { start: number; end: number; text: string }[]>();
      for (const b of blocks) {
        const normalized = this.normalizeAstLike(b.text);
        const hash = await this.hash(normalized);
        const arr = map.get(hash) || [];
        arr.push(b);
        map.set(hash, arr);
      }
      for (const [_, list] of map.entries()) {
        if (list.length > 1) {
          for (const item of list) {
            issues.push({ filePath: file, issueType: 'DuplicateCode', metadata: { duplicates: list.length }, codeBlock: item.text });
          }
        }
      }
    }

    return { projectName: this.deriveProjectName(gitUrl), issues };
  }

  private supports(ext: string, language: string) {
    const ts = ['.ts', '.tsx', '.js', '.jsx'];
    const py = ['.py'];
    const l = language.toLowerCase();
    if (l.includes('ts') || l.includes('js')) return ts.includes(ext);
    if (l.includes('py')) return py.includes(ext);
    return false;
  }

  private async collectFiles(root: string) {
    const walk = async (dir: string, acc: string[] = []) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          const name = e.name.toLowerCase();
          if (name === '.git' || name === 'node_modules' || name === 'dist' || name === 'build' || name === '.next') {
            continue;
          }
          await walk(p, acc);
        }
        else acc.push(p);
      }
      return acc;
    };
    return walk(root);
  }

  // Very rough cyclomatic complexity estimation by counting branching nodes
  private async detectHighComplexityFunctions(
    tree: any,
    code: string,
    projectId: number,
    filePath: string
  ) {
    const functionNodes = this.queryNodes(tree, [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'function',
    ]);

    for (const node of functionNodes) {
      const signature = code.slice(node.startIndex, node.endIndex);
      const complexity = this.estimateCyclomaticComplexity(node, code);
      if (complexity > this.complexityThreshold) {
  await (this.prisma as any).issue.create({
          data: {
            projectId,
            filePath,
            functionName: this.extractFunctionName(node, code),
            issueType: 'HighComplexity',
            metadata: { complexity },
            codeBlock: signature,
          },
        });
      }
    }
  }

  private estimateCyclomaticComplexity(node: any, code: string) {
    const keywords = ['if', 'for', 'while', 'case', 'catch', '&&', '||', '?'];
    const text = code.slice(node.startIndex, node.endIndex);
    let score = 1;
    for (const kw of keywords) {
      const matches = text.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (matches) score += matches.length;
    }
    return score;
  }

  private estimateCyclomaticComplexityFromText(text: string) {
    const keywords = ['if', 'for', 'while', 'case', 'catch', '&&', '||', '?', 'elif'];
    let score = 1;
    for (const kw of keywords) {
      const matches = text.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (matches) score += matches.length;
    }
    return score;
  }

  private estimateCyclomaticComplexityAst(node: any, code: string) {
    // Basic approach: count decision keywords within node range
    const text = code.slice(node.startIndex, node.endIndex);
    return this.estimateCyclomaticComplexityFromText(text);
  }

  private extractFunctionName(node: any, code: string) {
    // Simple heuristic for function name
    const text = code.slice(node.startIndex, node.endIndex);
    const m = text.match(/function\s+(\w+)/) || text.match(/(\w+)\s*\(/);
    return m ? m[1] : null;
  }

  // Deprecated in favor of generic block flow (kept for reference)
  private async detectDuplicateBlocks() { /* no-op */ }

  private queryNodes(tree: any, types: string[]) {
    const nodes: any[] = [];
    const walk = (n: any) => {
      if (types.includes(n.type)) nodes.push(n);
      for (let i = 0; i < n.childCount; i++) walk(n.child(i)!);
    };
    walk(tree.rootNode);
    return nodes;
  }

  private normalizeAstLike(text: string) {
    // Replace identifiers with placeholders to detect structural duplicates
    return text
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (m) => {
        // keep keywords minimalistically
        const kw = ['if', 'for', 'while', 'return', 'const', 'let', 'var', 'function', 'def', 'class', 'elif', 'else'];
        return kw.includes(m) ? m : 'ID';
      })
      .replace(/\d+/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractFunctionNameFromText(text: string, language: string) {
    const lang = language.toLowerCase();
    if (lang.includes('py')) {
      const m = text.match(/def\s+(\w+)\s*\(/);
      return m ? m[1] : null;
    }
    const m = text.match(/function\s+(\w+)/) || text.match(/(\w+)\s*\(/);
    return m ? m[1] : null;
  }

  private extractBlocksFallback(code: string, language: string) {
    const lang = language.toLowerCase();
    if (lang.includes('py')) return this.extractBlocksFallbackPy(code);
    // default to JS/TS
    return this.extractBlocksFallbackJs(code);
  }

  private extractBlocksFallbackJs(code: string) {
    const blocks: { start: number; end: number; text: string }[] = [];
    const findMatchingBrace = (startIdx: number) => {
      let depth = 0;
      for (let i = startIdx; i < code.length; i++) {
        const ch = code[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    };
    // function declarations
    const funcRegex = /function\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{/g;
    for (let m; (m = funcRegex.exec(code)); ) {
      const braceIdx = m.index + m[0].lastIndexOf('{');
      const end = findMatchingBrace(braceIdx);
      if (end > braceIdx) blocks.push({ start: m.index, end: end + 1, text: code.slice(m.index, end + 1) });
    }
    // arrow functions with block body: => { ... }
    const arrowRegex = /=>\s*\{/g;
    for (let m; (m = arrowRegex.exec(code)); ) {
      const braceIdx = m.index + m[0].indexOf('{');
      const end = findMatchingBrace(braceIdx);
      if (end > braceIdx) {
        // backtrack a bit to include variable name if present
        const start = Math.max(0, code.lastIndexOf('\n', m.index - 80));
        blocks.push({ start, end: end + 1, text: code.slice(start, end + 1) });
      }
    }
    return blocks;
  }

  private extractBlocksFallbackPy(code: string) {
    const blocks: { start: number; end: number; text: string }[] = [];
    const lines = code.split(/\r?\n/);
    let offset = 0; // track index offset
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const defMatch = line.match(/^([ \t]*)def\s+\w+\s*\(.*\)\s*:/);
      const lineStartIdx = offset;
      const lineEndIdx = offset + line.length;
      if (defMatch) {
        const indent = defMatch[1] || '';
        let j = i + 1;
        let endIdx = lineEndIdx;
        for (; j < lines.length; j++) {
          const l = lines[j];
          const isBlank = /^\s*$/.test(l);
          const ind = (l.match(/^([ \t]*)/) || ['',''])[1];
          if (!isBlank && ind.length <= indent.length) break;
          endIdx += 1 + l.length; // +1 for newline
        }
        blocks.push({ start: lineStartIdx, end: endIdx, text: code.slice(lineStartIdx, endIdx) });
        i = j - 1;
      }
      offset = lineEndIdx + 1;
    }
    return blocks;
  }

  private async hash(input: string) {
    // simple djb2 hash as string key
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 33) ^ input.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  // Heuristic magic number detection within a block of code
  private findMagicNumbers(text: string, language: string): { value: number; count: number }[] {
    // Ignore common non-magic values
    const ignore = new Set([0, 1, -1]);
    // Extract numeric literals
    const nums = text.match(/(?<![A-Za-z_])[-+]?\b\d+(?:_\d+)*(?:\.\d+)?\b/g) || [];
    const counts = new Map<number, number>();
    for (const n of nums) {
      const v = Number(n.replace(/_/g, ''));
      if (Number.isNaN(v)) continue;
      if (ignore.has(v)) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }

    // Filter numbers that appear in likely loop headers (very rough)
    const filtered: { value: number; count: number }[] = [];
    for (const [value, count] of counts.entries()) {
      // Exclude if used in typical for-range patterns (best-effort)
      const re = new RegExp(`for\\s*\\([^)]*?${value}[^)]*\)`);
      if (re.test(text)) continue;
      filtered.push({ value, count });
    }
    return filtered;
  }
}
