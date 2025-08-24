import { Injectable } from '@nestjs/common';
import { extname, join, relative } from 'path';
import { readdir, readFile } from 'fs/promises';
// ...existing code...
@Injectable()
export class ParserService {
  private parser: any;
  private languages: Map<string, any>;
  private tsApi: any | undefined;

  // Recursively serialize Tree-sitter AST as nested JSON
  private serializeTreeSitterAst(node: any): any {
    if (!node) return null;
    const obj: any = {
      type: node.type,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      children: [],
    };
    if (node.namedChildCount && node.namedChildCount > 0) {
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) obj.children.push(this.serializeTreeSitterAst(child));
      }
    } else if (node.childCount && node.childCount > 0) {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) obj.children.push(this.serializeTreeSitterAst(child));
      }
    }
    return obj;
  }

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      let Parser: any;
      try {
        Parser = require('tree-sitter');
      } catch (e1) {
        // some environments ship under 'node-tree-sitter'
        Parser = require('node-tree-sitter');
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ts = require('tree-sitter-typescript');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Py = require('tree-sitter-python');
      this.parser = new Parser();
      this.languages = new Map([
        ['typescript', Ts.typescript],
        ['tsx', Ts.tsx],
        ['python', Py],
      ]);
    } catch {
      this.parser = undefined;
      this.languages = new Map();
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.tsApi = require('typescript');
    } catch {
      this.tsApi = undefined;
    }
  }

  // Public helpers for AnalysisService to reuse the single parser instance
  isTreeSitterAvailable(): boolean {
    return !!this.parser && this.languages.size > 0;
  }

  getLanguageKeyByExt(ext: string): 'typescript' | 'tsx' | 'python' {
    const e = ext.toLowerCase();
    if (e === '.py') return 'python';
    if (e === '.tsx') return 'tsx';
    return 'typescript';
  }

  parseWithTreeSitter(code: string, extOrLangKey: string): { tree: any; langKey: string } | null {
    if (!this.isTreeSitterAvailable()) return null;
    const langKey = extOrLangKey.startsWith('.')
      ? this.getLanguageKeyByExt(extOrLangKey)
      : (extOrLangKey as any);
    const langObj = this.languages.get(langKey);
    if (!langObj) return null;
    try {
      this.parser.setLanguage(langObj);
      const tree = this.parser.parse(code);
      return { tree, langKey };
    } catch {
      return null;
    }
  }

  // Run a Tree-sitter Query against an existing tree root node
  runQueryOnTree(rootNode: any, langKey: string, queryString: string): Array<{ node: any; name: string }> | null {
    if (!this.isTreeSitterAvailable()) return null;
    const langObj = this.languages.get(langKey);
    if (!langObj || !this.parser) return null;
    try {
      const ParserCtor: any = (this.parser as any).constructor;
      if (!ParserCtor?.Query) return null;
      const Query = ParserCtor.Query;
      const q = new Query(langObj, queryString);
      const captures = q.captures(rootNode) as Array<{ node: any; name: string }>;
      return captures;
    } catch {
      return null;
    }
  }

  async parseRepo(root: string, language: string): Promise<Record<string, { ast: string; format: string; language: string }>> {
    const files = await this.collectFiles(root);
    const asts: Record<string, { ast: string; format: string; language: string }> = {};
    for (const file of files) {
      const relPath = relative(root, file).replace(/\\/g, '/');
      const ext = extname(file).toLowerCase();
      const code = await readFile(file, 'utf8');
      let ast: string | null = null;
      let format = '';
      let lang = '';
      // Try Tree-sitter first
      try {
        const parsed = this.parseWithTreeSitter(code, ext);
        if (parsed) {
          ast = JSON.stringify(this.serializeTreeSitterAst((parsed as any).tree.rootNode), null, 2);
          format = 'tree-sitter-json';
          lang = parsed.langKey;
        }
      } catch {}
      // Fallback to TS compiler for JS/TS/TSX
      if (!ast && this.tsApi && (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx')) {
        try {
          const ts = this.tsApi;
          const scriptKind = ext === '.tsx' ? ts.ScriptKind.TSX : ext === '.jsx' ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
          const sf = ts.createSourceFile('tmp' + ext, code, ts.ScriptTarget.ES2020, true, scriptKind);
          const serialize = (n: any): any => {
            const nodeObj: any = {
              type: ts.SyntaxKind[n.kind],
              pos: n.pos,
              end: n.end,
              children: [] as any[],
            };
            ts.forEachChild(n, (c: any) => {
              nodeObj.children.push(serialize(c));
            });
            return nodeObj;
          };
          ast = JSON.stringify(serialize(sf), null, 2);
          format = 'ts-compiler-json';
          lang = 'typescript-like';
        } catch {}
      }
      if (ast) {
        asts[relPath] = { ast, format, language: lang };
      }
    }
    return asts;
  }

  private async collectFiles(root: string): Promise<string[]> {
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
        } else acc.push(p);
      }
      return acc;
    };
    return walk(root);
  }
}
