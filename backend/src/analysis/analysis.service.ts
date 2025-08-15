import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import simpleGit from 'simple-git';
import { tmpdir } from 'os';
import { mkdtemp, readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
// node-tree-sitter bindings
import Parser = require('tree-sitter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Ts = require('tree-sitter-typescript');

@Injectable()
export class AnalysisService {
  private complexityThreshold = 10;

  constructor(private readonly prisma: PrismaService) {}

  async startAnalysis(gitUrl: string, language: string, userId?: number): Promise<number> {
    // Create project or reuse existing
    const project = await this.prisma.project.upsert({
      where: { gitUrl },
      update: {},
      create: {
        name: this.deriveProjectName(gitUrl),
        gitUrl,
        language,
        user: userId
          ? { connect: { id: userId } }
          : { create: { email: `${Date.now()}@placeholder.local` } },
      },
    });

    // Async fire-and-forget analysis (no queue for demo)
    this.analyzeRepo(gitUrl, language, project.id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Analysis failed', err);
    });

    return project.id;
  }

  private deriveProjectName(gitUrl: string) {
    const name = gitUrl.split('/').pop() || 'project';
    return name.replace(/\.git$/, '');
  }

  private async analyzeRepo(gitUrl: string, language: string, projectId: number) {
    const dir = await mkdtemp(join(tmpdir(), 'codestruct-'));
    const git = simpleGit();
    await git.clone(gitUrl, dir);

    const files = await this.collectFiles(dir);

    for (const file of files) {
      const code = await readFile(file, 'utf8');
      const ext = extname(file).toLowerCase();
      if (!this.supports(ext, language)) continue;
      // Parse AST
      const parser = new Parser();
      if (language.toLowerCase().includes('ts')) {
        parser.setLanguage(Ts.typescript);
      } else {
        parser.setLanguage(Ts.tsx);
      }
      const tree = parser.parse(code);

      await this.detectHighComplexityFunctions(tree, code, projectId, file);
      await this.detectDuplicateBlocks(tree, code, projectId, file);
    }
  }

  private supports(ext: string, language: string) {
    const ts = ['.ts', '.tsx', '.js', '.jsx'];
    if (language.toLowerCase().includes('ts') || language.toLowerCase().includes('js')) {
      return ts.includes(ext);
    }
    return false;
  }

  private async collectFiles(root: string) {
    const walk = async (dir: string, acc: string[] = []) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) await walk(p, acc);
        else acc.push(p);
      }
      return acc;
    };
    return walk(root);
  }

  // Very rough cyclomatic complexity estimation by counting branching nodes
  private async detectHighComplexityFunctions(
    tree: Parser.Tree,
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
        await this.prisma.issue.create({
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

  private estimateCyclomaticComplexity(node: Parser.SyntaxNode, code: string) {
    const keywords = ['if', 'for', 'while', 'case', 'catch', '&&', '||', '?'];
    const text = code.slice(node.startIndex, node.endIndex);
    let score = 1;
    for (const kw of keywords) {
      const matches = text.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (matches) score += matches.length;
    }
    return score;
  }

  private extractFunctionName(node: Parser.SyntaxNode, code: string) {
    // Simple heuristic for function name
    const text = code.slice(node.startIndex, node.endIndex);
    const m = text.match(/function\s+(\w+)/) || text.match(/(\w+)\s*\(/);
    return m ? m[1] : null;
  }

  private async detectDuplicateBlocks(
    tree: Parser.Tree,
    code: string,
    projectId: number,
    filePath: string
  ) {
    const blocks = this.queryNodes(tree, ['function_declaration', 'method_definition']);
    const map = new Map<string, { start: number; end: number; text: string }[]>();
    for (const node of blocks) {
      const normalized = this.normalizeAst(node, code);
      const hash = await this.hash(normalized);
      const entry = { start: node.startIndex, end: node.endIndex, text: code.slice(node.startIndex, node.endIndex) };
      const arr = map.get(hash) || [];
      arr.push(entry);
      map.set(hash, arr);
    }
    for (const [_, list] of map.entries()) {
      if (list.length > 1) {
        for (const item of list) {
          await this.prisma.issue.create({
            data: {
              projectId,
              filePath,
              functionName: null,
              issueType: 'DuplicateCode',
              metadata: { duplicates: list.length },
              codeBlock: item.text,
            },
          });
        }
      }
    }
  }

  private queryNodes(tree: Parser.Tree, types: string[]) {
    const nodes: Parser.SyntaxNode[] = [];
    const walk = (n: Parser.SyntaxNode) => {
      if (types.includes(n.type)) nodes.push(n);
      for (let i = 0; i < n.childCount; i++) walk(n.child(i)!);
    };
    walk(tree.rootNode);
    return nodes;
  }

  private normalizeAst(node: Parser.SyntaxNode, code: string) {
    // Replace identifiers with placeholders to detect structural duplicates
    const text = code.slice(node.startIndex, node.endIndex);
    return text
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (m) => {
        // keep keywords minimalistically
        const kw = ['if', 'for', 'while', 'return', 'const', 'let', 'var', 'function'];
        return kw.includes(m) ? m : 'ID';
      })
      .replace(/\d+/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async hash(input: string) {
    // simple djb2 hash as string key
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 33) ^ input.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }
}
