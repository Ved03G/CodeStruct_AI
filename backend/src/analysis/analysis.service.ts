import { Injectable } from '@nestjs/common';
import { ParserService } from '../parser/parser.service';
import { PrismaService } from '../prisma/prisma.service';
import simpleGit from 'simple-git';
import { tmpdir } from 'os';
import { mkdtemp, readdir, readFile } from 'fs/promises';
import { join, extname, relative } from 'path';

@Injectable()
export class AnalysisService {
  private complexityThreshold = 15; // raised for better initial signal

  // Tree-sitter parser and language cache (initialized once)
  private parser: any;
  private languages: Map<string, any>;
  private tsApi: any | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: ParserService,
  ) {
    // Lazy-safe init of parser and languages
  try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Parser = require('tree-sitter');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ts = require('tree-sitter-typescript');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Py = require('tree-sitter-python');

      this.parser = new Parser();
      this.languages = new Map<string, any>([
        ['typescript', Ts.typescript],
        ['tsx', Ts.tsx],
        ['python', Py],
      ]);
      if (process.env.ANALYSIS_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[analysis] Tree-sitter initialized');
      }
    } catch (e) {
      this.parser = undefined;
      this.languages = new Map();
      // eslint-disable-next-line no-console
      console.warn('[analysis] Tree-sitter not available, falling back to text heuristics');
    }

    // Try to load TypeScript API for AST-based fallback normalization
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.tsApi = require('typescript');
      if (process.env.ANALYSIS_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[analysis] TypeScript API available for AST fallback');
      }
    } catch {
      this.tsApi = undefined;
    }
  }

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
      if (process.env.ANALYSIS_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`[analysis] cloned into: ${dir}`);
      }

      // Reset existing issues for re-run scenarios
      await (this.prisma as any).issue.deleteMany({ where: { projectId } });
  await (this.prisma as any).fileAst?.deleteMany?.({ where: { projectId } }).catch(() => {});

      const files = await this.collectFiles(dir);
      // Parse all files and persist ASTs using ParserService
      const asts = await this.parserService.parseRepo(dir, language);
      for (const [relPath, astObj] of Object.entries(asts)) {
        await (this.prisma as any).fileAst.create({
          data: {
            projectId,
            filePath: relPath,
            language: astObj.language,
            astFormat: astObj.format,
            ast: String(astObj.ast).slice(0, 500000),
          },
        }).catch(() => {});
      }
      if (process.env.ANALYSIS_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`[analysis] total files found: ${files.length}`);
      }
      // Store file inventory for the project (use repo-relative paths)
      try {
        await (this.prisma as any).projectFile?.deleteMany?.({ where: { projectId } });
        const batch = files.slice(0, 5000).map((p) => {
          const rel = relative(dir!, p).replace(/\\/g, '/');
          const e = extname(p).toLowerCase();
          return { projectId, filePath: rel, ext: e, supported: this.supports(e, language) };
        });
        if (batch.length) await (this.prisma as any).projectFile?.createMany?.({ data: batch, skipDuplicates: true });
      } catch {}

  // Global duplicate map across files (structural hashes)
  const duplicateMap = new Map<string, { file: string; text: string }[]>();

      let created = 0;
      for (const file of files) {
        const displayPath = relative(dir!, file).replace(/\\/g, '/');
        const code = await readFile(file, 'utf8');
        const ext = extname(file).toLowerCase();
        if (!this.supports(ext, language)) continue;
        if (process.env.ANALYSIS_DEBUG) {
          // eslint-disable-next-line no-console
          console.log(`[analysis] analyzing: ${displayPath}`);
        }
        let blocks: { start: number; end: number; text: string; node?: any }[] = [];
        let astSucceeded = false;
        // Try AST first
        try {
          const langKey = ext === '.py' ? 'python' : (ext === '.tsx' ? 'tsx' : 'typescript');
          const langObj = this.languages.get(langKey);
          if (!langObj) throw new Error(`Language not initialized for ${langKey}`);
          this.parser.setLanguage(langObj);
          const tree = this.parser.parse(code);
          // Save S-expression for UI
          try {
            const sexpr = tree.rootNode.sExpression;
      await (this.prisma as any).fileAst.create({
              data: {
                projectId,
        filePath: displayPath,
                language: langKey,
                astFormat: 's-expression',
                ast: String(sexpr).slice(0, 500000),
              },
            });
          } catch {}
          const fnTypes = ['function_declaration', 'method_definition', 'arrow_function', 'function', 'function_definition'];
          const nodes = this.queryNodes(tree, fnTypes);
          const complexitiesAst: number[] = [];
          blocks = nodes.map((node: any) => {
            const text = code.slice(node.startIndex, node.endIndex);
            const cpx = this.estimateCyclomaticComplexityAst(node, code, language);
            complexitiesAst.push(cpx);
            return { start: node.startIndex, end: node.endIndex, text, node };
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
            created++;
          }
        }
          astSucceeded = blocks.length > 0;
        } catch (e: any) {
          // Log AST parsing failure for visibility
          // eslint-disable-next-line no-console
          console.error(`[analysis] AST parsing failed for file ${file}:`, e);
          // Fallback extraction if AST not available
          blocks = this.extractBlocksFallback(code, language);
          // Try to store a structural AST via TS API for TS/TSX/JS
          if (this.tsApi && (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx')) {
            const norm = this.normalizeAndHashTsSnippet(code, ext);
            if (norm) {
        await (this.prisma as any).fileAst.create({
                data: {
                  projectId,
          filePath: displayPath,
                  language: 'typescript-like',
                  astFormat: 'ts-compiler',
                  ast: String(norm).slice(0, 500000),
                },
              }).catch(() => {});
            }
          }
        }

        // High complexity issues (fallback, when AST path failed)
        if (!astSucceeded) {
          for (const b of blocks) {
            const complexity = this.estimateCyclomaticComplexityFromText(b.text);
            if (complexity > this.complexityThreshold) {
        await (this.prisma as any).issue.create({
                data: {
                  projectId,
          filePath: displayPath,
                  functionName: this.extractFunctionNameFromText(b.text, language),
                  issueType: 'HighComplexity',
                  metadata: { complexity },
                  codeBlock: b.text,
                },
              });
              created++;
            }
          }
          // As a last resort, run magic-number detection over entire file if no blocks
          if (!blocks.length) {
            const magicWhole = this.findMagicNumbers(code, language);
            for (const m of magicWhole) {
              await (this.prisma as any).issue.create({
                data: {
                  projectId,
          filePath: displayPath,
                  functionName: null,
                  issueType: 'MagicNumber',
                  metadata: { value: m.value, count: m.count },
                  codeBlock: code.slice(0, Math.min(code.length, 2000)),
                },
              });
              created++;
            }
          }
        }

        // Record blocks for global duplicate detection
        for (const b of blocks) {
          let hash: string | undefined;
          if (b.node && this.parser) {
            const normalized = this.normalizeAndHashNode(b.node);
            hash = this.simpleHash(normalized);
          } else if (this.tsApi && (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx')) {
            const normTs = this.normalizeAndHashTsSnippet(b.text, ext);
            hash = this.simpleHash(normTs || this.normalizeAstLike(b.text));
          } else {
            // Fallback structural approximation when AST unavailable
            hash = this.simpleHash(this.normalizeAstLike(b.text));
          }
          const arr = duplicateMap.get(hash) || [];
      arr.push({ file: displayPath, text: b.text });
          duplicateMap.set(hash, arr);
        }

        // Magic numbers detection per block
        for (const b of blocks) {
          const magic = this.findMagicNumbers(b.text, language);
          for (const m of magic) {
      await (this.prisma as any).issue.create({
              data: {
                projectId,
        filePath: displayPath,
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
    created++;
          }
        }
      }
  if (process.env.ANALYSIS_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`[analysis] total issues created: ${created}`);
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
      let blocks: { start: number; end: number; text: string; node?: any }[] = [];
      try {
        const langKey = ext === '.py' ? 'python' : (ext === '.tsx' ? 'tsx' : 'typescript');
        const langObj = this.languages.get(langKey);
        if (!langObj) throw new Error(`Language not initialized for ${langKey}`);
        this.parser.setLanguage(langObj);
        const tree = this.parser.parse(code);
        const fnTypes = ['function_declaration', 'method_definition', 'arrow_function', 'function', 'function_definition'];
        const nodes = this.queryNodes(tree, fnTypes);
        blocks = nodes.map((n: any) => ({ start: n.startIndex, end: n.endIndex, text: code.slice(n.startIndex, n.endIndex), node: n }));
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(`[analysis:quick] AST parsing failed for file ${file}:`, e);
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
        if (!b.node) continue;
        const normalized = this.normalizeAndHashNode(b.node);
        const hash = this.simpleHash(normalized);
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

  private estimateCyclomaticComplexityAst(node: any, code: string, language: string) {
    // Traverse AST and count decision nodes per spec
    const decisionTypesTs = new Set([
      'if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_clause', 'catch_clause', 'conditional_expression',
    ]);
    const decisionTypesPy = new Set([
      'if_statement', 'for_statement', 'while_statement', 'except_clause', 'conditional_expression',
    ]);
    const isPy = language.toLowerCase().includes('py');
    const decisionTypes = isPy ? decisionTypesPy : decisionTypesTs;
    let score = 1;
    const walk = (n: any) => {
      if (!n) return;
      if (decisionTypes.has(n.type)) score++;
      // Count logical operators inside this node text
      const text = code.slice(n.startIndex, n.endIndex);
      const logicalCount = (text.match(/&&|\|\|/g) || []).length;
      score += logicalCount;
      for (let i = 0; i < n.childCount; i++) walk(n.child(i));
    };
    walk(node);
    return score;
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

  // Build a structural string from an AST node, replacing identifiers with a placeholder
  private normalizeAndHashNode(node: any): string {
    if (!node) return '';
    // Ignore certain trivial token types
    const ignoreTypes = new Set(['comment', ';', ',']);
    if (ignoreTypes.has(node.type)) return '';
    // Replace identifiers generically
    const identifierTypes = new Set(['identifier', 'property_identifier']);
    if (identifierTypes.has(node.type)) {
      return '(IDENTIFIER)';
    }
    // Recursively include only named children to skip punctuation/whitespace
    let result = `(${node.type}`;
    if (Array.isArray(node.namedChildren)) {
      for (const child of node.namedChildren) {
        result += this.normalizeAndHashNode(child);
      }
    } else {
      // Fallback iterate children if namedChildren missing
      for (let i = 0; i < (node.childCount || 0); i++) {
        const c = node.child(i);
        if (c) result += this.normalizeAndHashNode(c);
      }
    }
    result += ')';
    return result;
  }

  private simpleHash(input: string): string {
    // djb2 variant
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      h = (h * 33) ^ input.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  // Fallback structural normalization using TypeScript compiler API (if available)
  private normalizeAndHashTsSnippet(code: string, ext: string): string | null {
    if (!this.tsApi) return null;
    try {
      const ts = this.tsApi;
      const scriptKind = ext === '.tsx' ? ts.ScriptKind.TSX : ext === '.jsx' ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
      const sf = ts.createSourceFile('tmp' + ext, code, ts.ScriptTarget.ES2020, true, scriptKind);
      const idKinds = new Set([
        ts.SyntaxKind.Identifier,
        ts.SyntaxKind.PrivateIdentifier,
      ]);
      const ignoreKinds = new Set([
        ts.SyntaxKind.EndOfFileToken,
      ]);
      let out = '';
      const visit = (n: any) => {
        if (ignoreKinds.has(n.kind)) return;
        if (idKinds.has(n.kind)) {
          out += '(IDENTIFIER)';
          return;
        }
        out += '(' + ts.SyntaxKind[n.kind] + ')';
        ts.forEachChild(n, visit);
      };
      visit(sf);
      return out;
    } catch {
      return null;
    }
  }

  // Deprecated: kept temporarily for reference; no longer used
  private normalizeAstLike(text: string) {
    return text
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, 'ID')
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
    // class methods and constructors
    const reserved = new Set(['if','for','while','switch','catch','try','else','do','function']);
    const methodRegex = /(?:^|\n)\s*(?:public|private|protected|static|async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/g;
    for (let m; (m = methodRegex.exec(code)); ) {
      const name = m[1];
      if (reserved.has(name)) continue;
      const braceIdx = m.index + m[0].lastIndexOf('{');
      const end = findMatchingBrace(braceIdx);
      if (end > braceIdx) {
        const start = m.index;
        blocks.push({ start, end: end + 1, text: code.slice(start, end + 1) });
      }
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

  // Deprecated: old hashing helper; replaced by simpleHash
  private async hash(input: string) {
    return this.simpleHash(input);
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
