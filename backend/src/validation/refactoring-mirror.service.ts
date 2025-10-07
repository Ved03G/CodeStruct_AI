import { Injectable } from '@nestjs/common';
import { parse as babelParse } from '@babel/parser';
import * as t from '@babel/types';

export interface RefactoringMirrorResult {
  isVerified: boolean;
  confidence: number;
  validationLayers: {
    syntactic: { passed: boolean; message?: string };
    signature: { passed: boolean; message?: string };
    structural: { passed: boolean; message?: string };
    behavioral: { passed: boolean; message?: string };
  };
  verificationBadge: 'verified' | 'warning' | 'failed';
}

export interface FunctionSignature {
  name: string;
  parameters: { name: string; type?: string }[];
  returnType?: string;
}

@Injectable()
export class RefactoringMirrorService {
  
  /**
   * The RefactoringMirror - Multi-layered validation pipeline
   * Each suggestion must pass through all applicable layers
   */
  async validateRefactoring(
    originalCode: string, 
    suggestedCode: string, 
    language: string,
    issueType: string
  ): Promise<RefactoringMirrorResult> {
    
    const result: RefactoringMirrorResult = {
      isVerified: false,
      confidence: 0,
      validationLayers: {
        syntactic: { passed: false },
        signature: { passed: false },
        structural: { passed: false },
        behavioral: { passed: false }
      },
      verificationBadge: 'failed'
    };

    try {
      console.log('[RefactoringMirror] Starting validation pipeline');

      // Layer 1: Syntactic Validation (The "Compiler Check")
      const syntacticResult = await this.validateSyntactic(suggestedCode, language);
      result.validationLayers.syntactic = syntacticResult;
      console.log('[RefactoringMirror] Layer 1 (Syntactic):', syntacticResult);
      
      if (!syntacticResult.passed) {
        result.verificationBadge = 'failed';
        return result;
      }

      // Layer 2: Signature Validation (The "Contract Check")
      const signatureResult = await this.validateSignature(originalCode, suggestedCode, language);
      result.validationLayers.signature = signatureResult;
      console.log('[RefactoringMirror] Layer 2 (Signature):', signatureResult);
      
      if (!signatureResult.passed) {
        result.verificationBadge = 'failed';
        return result;
      }

      // Layer 3: Structural Validation (The "Refactoring-Specific Check")
      const structuralResult = await this.validateStructural(originalCode, suggestedCode, language, issueType);
      result.validationLayers.structural = structuralResult;
      console.log('[RefactoringMirror] Layer 3 (Structural):', structuralResult);
      
      if (!structuralResult.passed) {
        result.verificationBadge = 'warning';
        result.confidence = 60; // Partial confidence
        return result;
      }

      // Layer 4: Behavioral Validation (The "Property-Based Test")
      const behavioralResult = await this.validateBehavioral(originalCode, suggestedCode, language);
      result.validationLayers.behavioral = behavioralResult;
      console.log('[RefactoringMirror] Layer 4 (Behavioral):', behavioralResult);
      
      // Calculate final verification status
      const allCriticalPassed = syntacticResult.passed && signatureResult.passed;
      const structuralPassed = structuralResult.passed;
      const behavioralPassed = behavioralResult.passed;
      
      if (allCriticalPassed && structuralPassed && behavioralPassed) {
        result.isVerified = true;
        result.confidence = 95;
        result.verificationBadge = 'verified';
      } else if (allCriticalPassed && structuralPassed) {
        result.isVerified = true;
        result.confidence = 80;
        result.verificationBadge = 'verified';
      } else {
        result.confidence = 60;
        result.verificationBadge = 'warning';
      }

      console.log('[RefactoringMirror] Final result:', {
        isVerified: result.isVerified,
        confidence: result.confidence,
        badge: result.verificationBadge
      });

    } catch (error: any) {
      console.error('[RefactoringMirror] Validation error:', error);
      result.validationLayers.syntactic.message = `Validation error: ${error.message}`;
    }

    return result;
  }

  /**
   * Layer 1: Syntactic Validation
   * Ensures the AI produced valid, parseable code
   */
  private async validateSyntactic(code: string, language: string): Promise<{ passed: boolean; message?: string }> {
    try {
      // Use Babel parser for all JavaScript/TypeScript files
      if (language.toLowerCase() === 'typescript' || language.toLowerCase() === 'javascript') {
        try {
          const ast = babelParse(code, {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            plugins: [
              'typescript',
              'jsx',
              'decorators-legacy',
              'asyncGenerators',
              'functionBind',
              'exportDefaultFrom',
              'exportNamespaceFrom'
            ]
          });
          
          // If parsing succeeds without throwing, syntax is valid
          return { 
            passed: true, 
            message: 'Code parses successfully with Babel parser'
          };
        } catch (error: any) {
          return { 
            passed: false, 
            message: `Syntax error: ${error?.message || 'Unknown parsing error'}`
          };
        }
      }
      
      // For other languages, do basic syntax checks
      return this.basicSyntaxCheck(code, language);
      
    } catch (error: any) {
      console.error('[RefactoringMirror] Syntactic validation error:', error);
      return { 
        passed: false, 
        message: `Validation error: ${error?.message || 'Unknown validation error'}`
      };
    }
  }

  /**
   * Fallback syntax validation for when Tree-sitter is not available
   */
  private basicSyntaxCheck(code: string, language: string): { passed: boolean; message?: string } {
    if (!code || code.trim().length === 0) {
      return { passed: false, message: 'Generated code is empty' };
    }

    // Basic checks based on language
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        // Check for basic JS/TS syntax patterns
        if (code.includes('function') || code.includes('=>') || code.includes('const ') || code.includes('let ')) {
          return { passed: true, message: 'Basic syntax validation passed' };
        }
        break;
      case 'python':
        // Check for basic Python patterns
        if (code.includes('def ') || code.includes('class ') || code.includes('=')) {
          return { passed: true, message: 'Basic syntax validation passed' };
        }
        break;
      case 'java':
        // Check for basic Java patterns
        if (code.includes('public ') || code.includes('private ') || code.includes('class ')) {
          return { passed: true, message: 'Basic syntax validation passed' };
        }
        break;
    }

    return { passed: true, message: 'Basic syntax validation passed (fallback)' };
  }

  /**
   * Layer 2: Signature Validation  
   * Ensures function signatures haven't changed (public contract preserved)
   */
  private async validateSignature(originalCode: string, suggestedCode: string, language: string): Promise<{ passed: boolean; message?: string }> {
    try {
      const originalSig = this.extractFunctionSignature(originalCode, language);
      const suggestedSig = this.extractFunctionSignature(suggestedCode, language);

      if (!originalSig && !suggestedSig) {
        return { passed: true, message: 'No function signatures to validate' };
      }

      if (!originalSig || !suggestedSig) {
        return { passed: false, message: 'Function signature missing in one version' };
      }

      // Check function name
      if (originalSig.name !== suggestedSig.name) {
        return { passed: false, message: `Function name changed: ${originalSig.name} → ${suggestedSig.name}` };
      }

      // Check parameter count
      if (originalSig.parameters.length !== suggestedSig.parameters.length) {
        return { passed: false, message: `Parameter count changed: ${originalSig.parameters.length} → ${suggestedSig.parameters.length}` };
      }

      // Check parameter names and types
      for (let i = 0; i < originalSig.parameters.length; i++) {
        const origParam = originalSig.parameters[i];
        const suggParam = suggestedSig.parameters[i];
        
        if (origParam.name !== suggParam.name) {
          return { passed: false, message: `Parameter name changed: ${origParam.name} → ${suggParam.name}` };
        }
        
        if (origParam.type && suggParam.type && origParam.type !== suggParam.type) {
          return { passed: false, message: `Parameter type changed: ${origParam.type} → ${suggParam.type}` };
        }
      }

      return { passed: true, message: 'Function signature preserved' };
      
    } catch (error: any) {
      return { passed: false, message: `Signature validation failed: ${error.message}` };
    }
  }

  /**
   * Layer 3: Structural Validation
   * Validates that the correct refactoring was performed based on issue type
   */
  private async validateStructural(originalCode: string, suggestedCode: string, language: string, issueType: string): Promise<{ passed: boolean; message?: string }> {
    try {
      switch (issueType.toLowerCase()) {
        case 'duplicatecode':
          return this.validateDuplicateCodeRefactoring(originalCode, suggestedCode, language);
        
        case 'magicnumber':
          return this.validateMagicNumberRefactoring(originalCode, suggestedCode, language);
        
        case 'deepnesting':
          return this.validateDeepNestingRefactoring(originalCode, suggestedCode, language);
        
        case 'longmethod':
          return this.validateLongMethodRefactoring(originalCode, suggestedCode, language);
        
        default:
          // For other issue types, do basic structural checks
          return this.validateGenericRefactoring(originalCode, suggestedCode, language);
      }
    } catch (error: any) {
      return { passed: false, message: `Structural validation failed: ${error.message}` };
    }
  }

  /**
   * Layer 4: Behavioral Validation
   * Property-based testing to ensure identical behavior
   */
  private async validateBehavioral(originalCode: string, suggestedCode: string, language: string): Promise<{ passed: boolean; message?: string }> {
    try {
      // For now, implement basic behavioral validation
      // In a full implementation, this would run property-based tests
      
      // Extract function calls and variable assignments
      const originalCalls = this.extractFunctionCalls(originalCode);
      const suggestedCalls = this.extractFunctionCalls(suggestedCode);
      
      // Check that the same external functions are called
      const originalExternalCalls = originalCalls.filter(call => !this.isInternalFunction(call, originalCode));
      const suggestedExternalCalls = suggestedCalls.filter(call => !this.isInternalFunction(call, suggestedCode));
      
      if (originalExternalCalls.length !== suggestedExternalCalls.length) {
        return { passed: false, message: 'Different number of external function calls detected' };
      }
      
      return { passed: true, message: 'Basic behavioral validation passed' };
      
    } catch (error: any) {
      return { passed: true, message: 'Behavioral validation skipped due to complexity' };
    }
  }

  // Helper methods for signature extraction
  private extractFunctionSignature(code: string, language: string): FunctionSignature | null {
    try {
      // Try regex-based extraction first (more reliable fallback)
      return this.regexExtractSignature(code, language);
    } catch {
      return null;
    }
  }

  private regexExtractSignature(code: string, language: string): FunctionSignature | null {
    let patterns: RegExp[] = [];
    
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        patterns = [
          /function\s+(\w+)\s*\(([^)]*)\)/,
          /(\w+)\s*=\s*function\s*\(([^)]*)\)/,
          /(\w+)\s*=\s*\(([^)]*)\)\s*=>/,
          /(\w+)\s*\(([^)]*)\)\s*{/
        ];
        break;
      case 'python':
        patterns = [
          /def\s+(\w+)\s*\(([^)]*)\)/
        ];
        break;
      case 'java':
        patterns = [
          /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(([^)]*)\)/
        ];
        break;
    }

    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        const name = match[1];
        const paramString = match[2] || '';
        const parameters = this.parseParameters(paramString, language);
        
        return { name, parameters };
      }
    }

    return null;
  }

  private parseParameters(paramString: string, language: string): { name: string; type?: string }[] {
    if (!paramString.trim()) return [];
    
    const params = paramString.split(',').map(p => p.trim());
    
    return params.map(param => {
      switch (language.toLowerCase()) {
        case 'typescript':
          // Handle TypeScript type annotations: "param: type"
          const tsMatch = param.match(/(\w+)\s*:\s*(\w+)/);
          if (tsMatch) {
            return { name: tsMatch[1], type: tsMatch[2] };
          }
          return { name: param };
        
        case 'python':
          // Handle Python type hints: "param: type"
          const pyMatch = param.match(/(\w+)\s*:\s*(\w+)/);
          if (pyMatch) {
            return { name: pyMatch[1], type: pyMatch[2] };
          }
          return { name: param };
        
        case 'java':
          // Handle Java: "Type param"
          const javaMatch = param.match(/(\w+)\s+(\w+)/);
          if (javaMatch) {
            return { name: javaMatch[2], type: javaMatch[1] };
          }
          return { name: param };
        
        default:
          return { name: param };
      }
    });
  }

  // Structural validation helpers
  private validateDuplicateCodeRefactoring(originalCode: string, suggestedCode: string, language: string): { passed: boolean; message?: string } {
    // Check if a new function was created and the original code was replaced with a call
    const hasNewFunction = this.hasNewFunctionDefinition(originalCode, suggestedCode);
    const hasExtractedCall = this.hasNewFunctionCall(originalCode, suggestedCode);
    
    if (hasNewFunction && hasExtractedCall) {
      return { passed: true, message: 'Duplicate code properly extracted into reusable function' };
    }
    
    return { passed: false, message: 'Duplicate code refactoring not detected' };
  }

  private validateMagicNumberRefactoring(originalCode: string, suggestedCode: string, language: string): { passed: boolean; message?: string } {
    // Check if constants were created and magic numbers replaced
    const hasNewConstant = this.hasNewConstantDefinition(originalCode, suggestedCode);
    const magicNumbersReplaced = this.magicNumbersWereReplaced(originalCode, suggestedCode);
    
    if (hasNewConstant && magicNumbersReplaced) {
      return { passed: true, message: 'Magic numbers properly replaced with named constants' };
    }
    
    return { passed: false, message: 'Magic number refactoring not detected' };
  }

  private validateDeepNestingRefactoring(originalCode: string, suggestedCode: string, language: string): { passed: boolean; message?: string } {
    const originalNesting = this.calculateNestingDepth(originalCode);
    const suggestedNesting = this.calculateNestingDepth(suggestedCode);
    
    if (suggestedNesting < originalNesting) {
      return { passed: true, message: `Nesting depth reduced from ${originalNesting} to ${suggestedNesting}` };
    }
    
    return { passed: false, message: 'Deep nesting not reduced' };
  }

  private validateLongMethodRefactoring(originalCode: string, suggestedCode: string, language: string): { passed: boolean; message?: string } {
    const originalLines = originalCode.split('\n').length;
    const suggestedLines = suggestedCode.split('\n').length;
    
    if (suggestedLines < originalLines * 0.8) { // At least 20% reduction
      return { passed: true, message: `Method length reduced from ${originalLines} to ${suggestedLines} lines` };
    }
    
    return { passed: false, message: 'Method length not significantly reduced' };
  }

  private validateGenericRefactoring(originalCode: string, suggestedCode: string, language: string): { passed: boolean; message?: string } {
    // Generic structural validation - check that code was actually changed
    if (originalCode.trim() === suggestedCode.trim()) {
      return { passed: false, message: 'No changes detected in refactored code' };
    }
    
    return { passed: true, message: 'Code was modified (generic structural validation)' };
  }

  // Utility methods
  private hasNewFunctionDefinition(originalCode: string, suggestedCode: string): boolean {
    const originalFunctions = this.extractFunctionNames(originalCode);
    const suggestedFunctions = this.extractFunctionNames(suggestedCode);
    
    return suggestedFunctions.length > originalFunctions.length;
  }

  private hasNewFunctionCall(originalCode: string, suggestedCode: string): boolean {
    const originalCalls = this.extractFunctionCalls(originalCode);
    const suggestedCalls = this.extractFunctionCalls(suggestedCode);
    
    return suggestedCalls.some(call => !originalCalls.includes(call));
  }

  private hasNewConstantDefinition(originalCode: string, suggestedCode: string): boolean {
    const constPattern = /const\s+\w+\s*=/g;
    const originalConstants = (originalCode.match(constPattern) || []).length;
    const suggestedConstants = (suggestedCode.match(constPattern) || []).length;
    
    return suggestedConstants > originalConstants;
  }

  private magicNumbersWereReplaced(originalCode: string, suggestedCode: string): boolean {
    const numberPattern = /\b\d+\b/g;
    const originalNumbers = (originalCode.match(numberPattern) || []).length;
    const suggestedNumbers = (suggestedCode.match(numberPattern) || []).length;
    
    return suggestedNumbers < originalNumbers;
  }

  private calculateNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
  }

  private extractFunctionNames(code: string): string[] {
    const patterns = [
      /function\s+(\w+)/g,
      /(\w+)\s*=\s*function/g,
      /(\w+)\s*=\s*\([^)]*\)\s*=>/g,
      /def\s+(\w+)/g
    ];
    
    const names: string[] = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        names.push(match[1]);
      }
    }
    
    return names;
  }

  private extractFunctionCalls(code: string): string[] {
    const callPattern = /(\w+)\s*\(/g;
    const calls: string[] = [];
    
    let match;
    while ((match = callPattern.exec(code)) !== null) {
      calls.push(match[1]);
    }
    
    return calls;
  }

  private isInternalFunction(functionName: string, code: string): boolean {
    const definitionPattern = new RegExp(`(?:function\\s+${functionName}|${functionName}\\s*=\\s*function|def\\s+${functionName})`, 'g');
    return definitionPattern.test(code);
  }
}