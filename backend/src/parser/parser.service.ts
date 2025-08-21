import { Injectable } from '@nestjs/common';
import { extname, join, relative } from 'path';
import { readdir, readFile } from 'fs/promises';

@Injectable()
export class ParserService {
  private parser: any;
  private languages: Map<string, any>;
  private tsApi: any | undefined;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Parser = require('tree-sitter');
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
        if (this.parser) {
          const langKey = ext === '.py' ? 'python' : (ext === '.tsx' ? 'tsx' : 'typescript');
          const langObj = this.languages.get(langKey);
          if (langObj) {
            this.parser.setLanguage(langObj);
            const tree = this.parser.parse(code);
            ast = tree.rootNode.sExpression;
            format = 's-expression';
            lang = langKey;
          }
        }
      } catch {}
      // Fallback to TS compiler for JS/TS/TSX
      if (!ast && this.tsApi && (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx')) {
        try {
          const ts = this.tsApi;
          const scriptKind = ext === '.tsx' ? ts.ScriptKind.TSX : ext === '.jsx' ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
          const sf = ts.createSourceFile('tmp' + ext, code, ts.ScriptTarget.ES2020, true, scriptKind);
          let out = '';
          const visit = (n: any) => {
            out += '(' + ts.SyntaxKind[n.kind] + ')';
            ts.forEachChild(n, visit);
          };
          visit(sf);
          ast = out;
          format = 'ts-compiler';
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
