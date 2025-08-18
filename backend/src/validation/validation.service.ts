import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidationService {
  async validate(originalCode: string, suggestedCode: string, language: string): Promise<{ isValid: boolean }> {
    // Try AST-based validation first; if unavailable, fall back to regex checks
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Parser = require('tree-sitter');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ts = require('tree-sitter-typescript');
      const parser = new Parser();
      parser.setLanguage(Ts.typescript);

      // Syntax check
      const tree = parser.parse(suggestedCode);
      if (!tree || !tree.rootNode) return { isValid: false };

      // Signature check for single top-level function
      const originalSig = this.extractTopLevelFunctionSignature(originalCode);
      const suggestedSig = this.extractTopLevelFunctionSignature(suggestedCode);

      if (originalSig && suggestedSig) {
        const sameName = originalSig.name === suggestedSig.name;
        const sameParams = JSON.stringify(originalSig.params) === JSON.stringify(suggestedSig.params);
        if (!sameName || !sameParams) return { isValid: false };
      }

      return { isValid: true };
    } catch {
      // Fallback: basic regex-based validation (name + params preserved)
      const o = this.regexSignature(originalCode);
      const s = this.regexSignature(suggestedCode);
      if (o && s) {
        const sameName = o.name === s.name;
        const sameParams = o.params === s.params;
        return { isValid: !!sameName && !!sameParams };
      }
      // If we cannot determine, be conservative
      return { isValid: false };
    }
  }

  private extractTopLevelFunctionSignature(code: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Parser = require('tree-sitter');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ts = require('tree-sitter-typescript');
      const parser = new Parser();
      parser.setLanguage(Ts.typescript);
      const tree = parser.parse(code);
      const root = tree.rootNode;
      for (let i = 0; i < root.childCount; i++) {
        const n = root.child(i);
        if (!n) continue;
        if (n.type === 'function_declaration') {
          // Try to find identifier and parameters by scanning children
          let name: string | undefined;
          let paramsText = '';
          for (let j = 0; j < n.childCount; j++) {
            const c = n.child(j);
            if (!c) continue;
            if (!name && c.type === 'identifier') name = c.text;
            if (!paramsText && (c.type.includes('parameters') || c.type === 'formal_parameters')) {
              paramsText = c.text.replace(/[()]/g, '');
            }
          }
          return { name, params: paramsText };
        }
      }
    } catch {
      // Ignore and fall back to regex extraction
    }
    const r = this.regexSignature(code);
    return r ? { name: r.name, params: r.params } : undefined;
  }

  private regexSignature(code: string): { name: string; params: string } | undefined {
    // Try function declaration
    const m = code.match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
    if (m) return { name: m[1], params: (m[2] || '').trim().replace(/\s+/g, ' ') };
    // Try export default function
    const m2 = code.match(/export\s+default\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
    if (m2) return { name: m2[1], params: (m2[2] || '').trim().replace(/\s+/g, ' ') };
    return undefined;
  }
}
