import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalysisHelperService {

    /**
     * Extract function information from AST node
     */
    extractFunctionInfo(node: any, language: string): any {
        const name = this.extractNodeName(node, language) || 'anonymous';
        const parameters = this.extractParameters(node, language);

        return {
            name,
            node,
            parameters,
            startIndex: node.startIndex || 0,
            endIndex: node.endIndex || 0,
            lineStart: this.getLineNumberFromIndex(node.startIndex || 0),
            lineEnd: this.getLineNumberFromIndex(node.endIndex || 0)
        };
    }

    /**
     * Extract class information from AST node
     */
    extractClassInfo(node: any, language: string): any {
        const name = this.extractNodeName(node, language) || 'anonymous';
        const methods = this.extractClassMethods(node, language);
        const fields = this.extractClassFields(node, language);

        return {
            name,
            node,
            methods,
            fields,
            startIndex: node.startIndex || 0,
            endIndex: node.endIndex || 0,
            lineStart: this.getLineNumberFromIndex(node.startIndex || 0),
            lineEnd: this.getLineNumberFromIndex(node.endIndex || 0)
        };
    }

    /**
     * Extract node name based on language
     */
    extractNodeName(node: any, language: string): string | null {
        if (!node) return null;

        // Try to find name in children
        const nameNode = this.findNameNode(node, language);
        if (nameNode) {
            return this.getNodeText(nameNode);
        }

        return null;
    }

    /**
     * Find name node in AST
     */
    private findNameNode(node: any, language: string): any {
        if (!node) return null;

        // Language-specific name extraction
        const nameTypes = this.getNameNodeTypes(language);

        // Check direct children for name nodes
        for (let i = 0; i < (node.namedChildCount || 0); i++) {
            const child = node.namedChild(i);
            if (child && nameTypes.includes(child.type)) {
                return child;
            }
        }

        // Look for specific patterns
        if (node.type === 'function_declaration' || node.type === 'method_definition') {
            // Look for identifier children
            for (let i = 0; i < (node.namedChildCount || 0); i++) {
                const child = node.namedChild(i);
                if (child && (child.type === 'identifier' || child.type === 'property_identifier')) {
                    return child;
                }
            }
        }

        return null;
    }

    /**
     * Get node types that represent names/identifiers
     */
    private getNameNodeTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['identifier', 'property_identifier'],
            javascript: ['identifier', 'property_identifier'],
            python: ['identifier'],
            java: ['identifier'],
            cpp: ['identifier']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    /**
     * Extract text from node
     */
    private getNodeText(node: any): string {
        // This would need access to the source code
        // For now, return a placeholder
        return node.text || 'unknown';
    }

    /**
     * Extract parameters from function node
     */
    extractParameters(node: any, language: string): any[] {
        const parameters: any[] = [];

        if (!node) return parameters;

        // Find parameter list node
        const paramListNode = this.findParameterListNode(node, language);
        if (!paramListNode) return parameters;

        // Extract individual parameters
        for (let i = 0; i < (paramListNode.namedChildCount || 0); i++) {
            const param = paramListNode.namedChild(i);
            if (param) {
                const paramInfo = this.extractParameterInfo(param, language);
                if (paramInfo) {
                    parameters.push(paramInfo);
                }
            }
        }

        return parameters;
    }

    /**
     * Find parameter list node
     */
    private findParameterListNode(node: any, language: string): any {
        const paramListTypes = ['formal_parameters', 'parameters', 'parameter_list'];

        for (let i = 0; i < (node.namedChildCount || 0); i++) {
            const child = node.namedChild(i);
            if (child && paramListTypes.includes(child.type)) {
                return child;
            }
        }

        return null;
    }

    /**
     * Extract parameter information
     */
    private extractParameterInfo(paramNode: any, language: string): any {
        if (!paramNode) return null;

        const name = this.extractNodeName(paramNode, language);
        const type = this.extractParameterType(paramNode, language);

        return {
            name: name || 'param',
            type: type || 'any',
            node: paramNode
        };
    }

    /**
     * Extract parameter type
     */
    private extractParameterType(paramNode: any, language: string): string | null {
        // Look for type annotation
        for (let i = 0; i < (paramNode.namedChildCount || 0); i++) {
            const child = paramNode.namedChild(i);
            if (child && (child.type === 'type_annotation' || child.type === 'type')) {
                return this.getNodeText(child);
            }
        }

        return null;
    }

    /**
     * Extract class methods
     */
    extractClassMethods(classNode: any, language: string): any[] {
        const methods: any[] = [];

        if (!classNode) return methods;

        const methodTypes = this.getMethodTypes(language);

        const walkNode = (node: any) => {
            if (!node) return;

            if (methodTypes.includes(node.type)) {
                const methodInfo = this.extractFunctionInfo(node, language);
                if (methodInfo) {
                    methods.push(methodInfo);
                }
            }

            // Recursively check children
            for (let i = 0; i < (node.namedChildCount || 0); i++) {
                walkNode(node.namedChild(i));
            }
        };

        walkNode(classNode);
        return methods;
    }

    /**
     * Extract class fields
     */
    extractClassFields(classNode: any, language: string): any[] {
        const fields: any[] = [];

        if (!classNode) return fields;

        const fieldTypes = this.getFieldTypes(language);

        const walkNode = (node: any) => {
            if (!node) return;

            if (fieldTypes.includes(node.type)) {
                const fieldInfo = this.extractFieldInfo(node, language);
                if (fieldInfo) {
                    fields.push(fieldInfo);
                }
            }

            // Recursively check children (but not too deep to avoid methods)
            if (node.type === 'class_body' || node.type === 'class_declaration') {
                for (let i = 0; i < (node.namedChildCount || 0); i++) {
                    walkNode(node.namedChild(i));
                }
            }
        };

        walkNode(classNode);
        return fields;
    }

    /**
     * Extract field information
     */
    private extractFieldInfo(fieldNode: any, language: string): any {
        const name = this.extractNodeName(fieldNode, language);
        const type = this.extractFieldType(fieldNode, language);

        return {
            name: name || 'field',
            type: type || 'any',
            node: fieldNode
        };
    }

    /**
     * Extract field type
     */
    private extractFieldType(fieldNode: any, language: string): string | null {
        // Similar to parameter type extraction
        for (let i = 0; i < (fieldNode.namedChildCount || 0); i++) {
            const child = fieldNode.namedChild(i);
            if (child && (child.type === 'type_annotation' || child.type === 'type')) {
                return this.getNodeText(child);
            }
        }

        return null;
    }

    /**
     * Get method node types for different languages
     */
    private getMethodTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['method_definition', 'function_declaration'],
            javascript: ['method_definition', 'function_declaration'],
            python: ['function_definition'],
            java: ['method_declaration', 'constructor_declaration'],
            cpp: ['function_definition']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    /**
     * Get field node types for different languages
     */
    private getFieldTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['property_definition', 'public_field_definition', 'private_field_definition'],
            javascript: ['property_definition'],
            python: ['expression_statement'], // Python fields are often assignments
            java: ['field_declaration'],
            cpp: ['field_declaration', 'member_declaration']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    /**
     * Find magic numbers in AST
     */
    findMagicNumbers(ast: any, code: string, language: string): any[] {
        const magicNumbers: any[] = [];
        const ignoreList = new Set([0, 1, -1, 2, 10, 100, 1000]);
        const foundNumbers = new Map<number, number>();

        if (!ast?.rootNode) return magicNumbers;

        const numberTypes = this.getNumberTypes(language);

        const walkNode = (node: any) => {
            if (!node) return;

            if (numberTypes.includes(node.type)) {
                const text = code.slice(node.startIndex, node.endIndex);
                const value = Number(text);

                if (!Number.isNaN(value) && !ignoreList.has(value) && Math.abs(value) > 1) {
                    foundNumbers.set(value, (foundNumbers.get(value) || 0) + 1);
                }
            }

            for (let i = 0; i < (node.namedChildCount || 0); i++) {
                walkNode(node.namedChild(i));
            }
        };

        walkNode(ast.rootNode);

        // Convert to magic number objects
        for (const [value, count] of foundNumbers.entries()) {
            magicNumbers.push({
                value,
                count,
                lineStart: 1, // Would need more context to get actual line
                lineEnd: 1,
                context: `Magic number ${value} appears ${count} times`
            });
        }

        return magicNumbers;
    }

    /**
     * Get number node types for different languages
     */
    private getNumberTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['number', 'numeric_literal'],
            javascript: ['number', 'numeric_literal'],
            python: ['integer', 'float'],
            java: ['decimal_integer_literal', 'decimal_floating_point_literal'],
            cpp: ['number_literal']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    /**
     * Find dead code patterns
     */
    findDeadCode(ast: any, code: string, language: string): any[] {
        const deadCodeBlocks: any[] = [];

        if (!ast?.rootNode) return deadCodeBlocks;

        // Look for unreachable code patterns
        this.findUnreachableCode(ast.rootNode, code, deadCodeBlocks);

        // Look for unused variables (simplified)
        this.findUnusedVariables(ast.rootNode, code, deadCodeBlocks);

        return deadCodeBlocks;
    }

    /**
     * Find unreachable code after return statements
     */
    private findUnreachableCode(node: any, code: string, deadCodeBlocks: any[]): void {
        if (!node) return;

        // Look for return statements followed by other statements
        if (node.type === 'return_statement') {
            const parent = node.parent;
            if (parent && parent.type === 'statement_block') {
                // Check if there are statements after this return
                const siblings = [];
                for (let i = 0; i < (parent.namedChildCount || 0); i++) {
                    siblings.push(parent.namedChild(i));
                }

                const returnIndex = siblings.indexOf(node);
                if (returnIndex >= 0 && returnIndex < siblings.length - 1) {
                    // There are statements after the return
                    const nextNode = siblings[returnIndex + 1];
                    deadCodeBlocks.push({
                        type: 'unreachable',
                        description: 'Code after return statement',
                        reason: 'Statements after return are never executed',
                        lineStart: this.getLineNumberFromIndex(nextNode.startIndex),
                        lineEnd: this.getLineNumberFromIndex(nextNode.endIndex),
                        code: code.slice(nextNode.startIndex, nextNode.endIndex),
                        confidence: 95
                    });
                }
            }
        }

        // Recursively check children
        for (let i = 0; i < (node.namedChildCount || 0); i++) {
            this.findUnreachableCode(node.namedChild(i), code, deadCodeBlocks);
        }
    }

    /**
     * Find unused variables (simplified heuristic)
     */
    private findUnusedVariables(node: any, code: string, deadCodeBlocks: any[]): void {
        // This is a simplified implementation
        // A full implementation would require symbol table analysis
        if (!node) return;

        if (node.type === 'variable_declaration' || node.type === 'lexical_declaration') {
            // Extract variable name and check if it's used later
            const varName = this.extractVariableName(node);
            if (varName) {
                const isUsed = this.isVariableUsed(node, varName, code);
                if (!isUsed) {
                    deadCodeBlocks.push({
                        type: 'unused_variable',
                        description: `Unused variable: ${varName}`,
                        reason: 'Variable is declared but never used',
                        lineStart: this.getLineNumberFromIndex(node.startIndex),
                        lineEnd: this.getLineNumberFromIndex(node.endIndex),
                        code: code.slice(node.startIndex, node.endIndex),
                        confidence: 80
                    });
                }
            }
        }

        // Recursively check children
        for (let i = 0; i < (node.namedChildCount || 0); i++) {
            this.findUnusedVariables(node.namedChild(i), code, deadCodeBlocks);
        }
    }

    /**
     * Extract variable name from declaration
     */
    private extractVariableName(node: any): string | null {
        // Look for identifier in variable declaration
        for (let i = 0; i < (node.namedChildCount || 0); i++) {
            const child = node.namedChild(i);
            if (child && child.type === 'variable_declarator') {
                for (let j = 0; j < (child.namedChildCount || 0); j++) {
                    const grandchild = child.namedChild(j);
                    if (grandchild && grandchild.type === 'identifier') {
                        return this.getNodeText(grandchild);
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if variable is used in the scope
     */
    private isVariableUsed(declarationNode: any, varName: string, code: string): boolean {
        // Simple heuristic: check if variable name appears after declaration
        const afterDeclaration = code.slice(declarationNode.endIndex);
        return afterDeclaration.includes(varName);
    }

    /**
     * Count external method calls
     */
    countExternalMethodCalls(node: any, language: string, code: string): any {
        const externalCalls = new Map<string, number>();
        let totalCalls = 0;

        if (!node) return { total: 0, mostUsedClass: '', distribution: {} };

        const callTypes = this.getCallExpressionTypes(language);

        const walkNode = (n: any) => {
            if (!n) return;

            if (callTypes.includes(n.type)) {
                const callInfo = this.extractCallInfo(n, code);
                if (callInfo && callInfo.isExternal) {
                    const className = callInfo.className || 'external';
                    externalCalls.set(className, (externalCalls.get(className) || 0) + 1);
                    totalCalls++;
                }
            }

            for (let i = 0; i < (n.namedChildCount || 0); i++) {
                walkNode(n.namedChild(i));
            }
        };

        walkNode(node);

        // Find most used class
        let mostUsedClass = '';
        let maxCount = 0;
        for (const [className, count] of externalCalls.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostUsedClass = className;
            }
        }

        return {
            total: totalCalls,
            mostUsedClass,
            distribution: Object.fromEntries(externalCalls)
        };
    }

    /**
     * Count local method calls
     */
    countLocalMethodCalls(node: any, language: string, code: string): number {
        let localCalls = 0;

        if (!node) return localCalls;

        const callTypes = this.getCallExpressionTypes(language);

        const walkNode = (n: any) => {
            if (!n) return;

            if (callTypes.includes(n.type)) {
                const callInfo = this.extractCallInfo(n, code);
                if (callInfo && !callInfo.isExternal) {
                    localCalls++;
                }
            }

            for (let i = 0; i < (n.namedChildCount || 0); i++) {
                walkNode(n.namedChild(i));
            }
        };

        walkNode(node);
        return localCalls;
    }

    /**
     * Get call expression types for different languages
     */
    private getCallExpressionTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['call_expression', 'member_expression'],
            javascript: ['call_expression', 'member_expression'],
            python: ['call', 'attribute'],
            java: ['method_invocation'],
            cpp: ['call_expression']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    /**
     * Extract call information
     */
    private extractCallInfo(callNode: any, code: string): any {
        const text = code.slice(callNode.startIndex, callNode.endIndex);

        // Simple heuristic: if it contains a dot, it's likely external
        const isExternal = text.includes('.');

        // Extract class name if external
        let className = '';
        if (isExternal) {
            const parts = text.split('.');
            if (parts.length > 1) {
                className = parts[0];
            }
        }

        return {
            isExternal,
            className,
            callText: text
        };
    }

    /**
     * Get line number from character index
     */
    getLineNumberFromIndex(index: number): number {
        // This would need access to the source code to count newlines
        // For now, return 1 as placeholder
        return 1;
    }
}