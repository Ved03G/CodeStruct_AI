import { Injectable } from '@nestjs/common';
import Parser = require('tree-sitter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Ts = require('tree-sitter-typescript');

@Injectable()
export class ValidationService {
  async validate(originalCode: string, suggestedCode: string, language: string): Promise<{ isValid: boolean }> {
    try {
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
      return { isValid: false };
    }
  }

  private extractTopLevelFunctionSignature(code: string) {
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
    return undefined;
  }
}
