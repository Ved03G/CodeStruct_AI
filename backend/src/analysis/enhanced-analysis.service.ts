import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParserService } from '../parser/parser.service';
import { AnalysisHelperService } from './analysis-helper.service';

export interface CodeSmellIssue {
    type: 'LongMethod' | 'GodClass' | 'DeepNesting' | 'LongParameterList' | 'HighComplexity' | 'CognitiveComplexity' | 'DuplicateCode' | 'MagicNumber' | 'DeadCode' | 'LargeClass' | 'FeatureEnvy' | 'DataClumps';
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number; // 0-100
    description: string;
    recommendation: string;
    filePath: string;
    functionName?: string;
    className?: string;
    lineStart: number;
    lineEnd: number;
    codeBlock: string;
    metrics: Record<string, any>;
}

@Injectable()
export class EnhancedAnalysisService {
    private readonly THRESHOLDS = {
        // Method complexity thresholds
        CYCLOMATIC_COMPLEXITY: {
            LOW: 8,        // Small methods
            MEDIUM: 15,    // Moderate complexity
            HIGH: 25,      // High complexity
            CRITICAL: 40   // Very complex, needs immediate refactoring
        },
        COGNITIVE_COMPLEXITY: {
            LOW: 10,       // Easy to understand
            MEDIUM: 20,    // Moderately complex
            HIGH: 35,      // Hard to understand
            CRITICAL: 50   // Very difficult to maintain
        },
        // Method length thresholds (lines) - more realistic for modern codebases
        METHOD_LENGTH: {
            LOW: 40,       // Small methods (20-40 lines)
            MEDIUM: 80,    // Medium methods (40-80 lines)
            HIGH: 150,     // Large methods (80-150 lines)
            CRITICAL: 250  // Very large methods (150+ lines)
        },
        // Class size thresholds - adjusted for real-world usage
        CLASS_SIZE: {
            LINES: { LOW: 300, MEDIUM: 600, HIGH: 1000, CRITICAL: 1500 },
            METHODS: { LOW: 20, MEDIUM: 35, HIGH: 50, CRITICAL: 80 }
        },
        // Parameter count thresholds
        PARAMETER_COUNT: {
            LOW: 4,        // Standard function parameters
            MEDIUM: 6,     // Getting complex
            HIGH: 8,       // Too many parameters
            CRITICAL: 12   // Definitely needs refactoring
        },
        // Nesting depth thresholds
        NESTING_DEPTH: {
            LOW: 3,        // Simple nesting
            MEDIUM: 4,     // Moderate nesting
            HIGH: 5,       // Deep nesting
            CRITICAL: 7
        },
        // Duplication thresholds
        DUPLICATE_LINES: {
            MIN_LINES: 6,
            MIN_TOKENS: 50
        }
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly parserService: ParserService,
        private readonly helperService: AnalysisHelperService,
    ) { }

    async analyzeCodeSmells(
        ast: any,
        code: string,
        filePath: string,
        language: string,
        projectId: number
    ): Promise<CodeSmellIssue[]> {
        console.log(`Analyzing code smells for ${filePath}`);
        const allIssues: CodeSmellIssue[] = [];

        // Process detections one by one to reduce memory usage
        const detections = [
            { name: 'Long Methods', fn: () => this.detectLongMethods(ast, code, filePath, language) },
            { name: 'God Classes', fn: () => this.detectGodClasses(ast, code, filePath, language) },
            { name: 'Deep Nesting', fn: () => this.detectDeepNesting(ast, code, filePath, language) },
            { name: 'Long Parameter Lists', fn: () => this.detectLongParameterLists(ast, code, filePath, language) },
            { name: 'Enhanced Complexity', fn: () => this.detectEnhancedComplexity(ast, code, filePath, language) },
            { name: 'Magic Numbers', fn: () => this.detectMagicNumbers(ast, code, filePath, language) },
            { name: 'Dead Code', fn: () => this.detectDeadCode(ast, code, filePath, language) },
            { name: 'Feature Envy', fn: () => this.detectFeatureEnvy(ast, code, filePath, language) }
        ];

        for (const detection of detections) {
            try {
                const issues = await detection.fn();

                // Store issues immediately to reduce memory usage
                for (const issue of issues) {
                    await this.storeIssue(issue, projectId);
                    allIssues.push(issue);
                }

                console.log(`${detection.name}: Found ${issues.length} issues in ${filePath}`);
            } catch (error) {
                console.error(`${detection.name} detection failed for ${filePath}:`, error instanceof Error ? error.message : String(error));
            }
        }

        return allIssues;
    }

    private async detectLongMethods(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const functions = this.extractFunctions(ast, language);

        for (const func of functions) {
            const lines = this.getLines(code, func.startIndex, func.endIndex);
            const lineCount = lines.length;
            const codeLines = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;

            let severity: CodeSmellIssue['severity'] = 'Low';
            let confidence = 70;

            if (codeLines >= this.THRESHOLDS.METHOD_LENGTH.CRITICAL) {
                severity = 'Critical';
                confidence = 95;
            } else if (codeLines >= this.THRESHOLDS.METHOD_LENGTH.HIGH) {
                severity = 'High';
                confidence = 85;
            } else if (codeLines >= this.THRESHOLDS.METHOD_LENGTH.MEDIUM) {
                severity = 'Medium';
                confidence = 75;
            } else if (codeLines >= this.THRESHOLDS.METHOD_LENGTH.LOW) {
                severity = 'Low';
                confidence = 65;
            } else {
                continue; // Skip if below threshold
            }

            // Adjust severity based on function characteristics for more realistic analysis
            const functionName = func.name.toLowerCase();

            // Main/setup/configure functions can be longer - they often orchestrate workflows
            if (functionName.includes('main') || functionName.includes('setup') ||
                functionName.includes('configure') || functionName.includes('initialize') ||
                functionName.includes('analyze') || functionName.includes('process')) {
                if (severity === 'Critical' && codeLines < 300) severity = 'High';
                else if (severity === 'High' && codeLines < 200) severity = 'Medium';
                confidence = Math.max(confidence - 10, 50);
            }

            // Test functions can also be longer due to setup/teardown
            if (functionName.includes('test') || functionName.includes('spec') || functionName.includes('describe')) {
                if (severity === 'Critical' && codeLines < 400) severity = 'High';
                else if (severity === 'High' && codeLines < 250) severity = 'Medium';
                confidence = Math.max(confidence - 15, 50);
            }

            issues.push({
                type: 'LongMethod',
                severity,
                confidence,
                description: `Method '${func.name}' has ${codeLines} lines of code (${severity.toLowerCase()} complexity)`,
                recommendation: this.getMethodLengthRecommendation(codeLines, func.name, severity),
                filePath,
                functionName: func.name,
                lineStart: func.lineStart,
                lineEnd: func.lineEnd,
                codeBlock: code.slice(func.startIndex, func.endIndex),
                metrics: {
                    totalLines: lineCount,
                    codeLines,
                    commentLines: lineCount - codeLines,
                    threshold: this.THRESHOLDS.METHOD_LENGTH.LOW
                }
            });
        }

        return issues;
    }

    private async detectGodClasses(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const classes = this.extractClasses(ast, language);

        for (const cls of classes) {
            const lines = this.getLines(code, cls.startIndex, cls.endIndex);
            const lineCount = lines.length;
            const methodCount = cls.methods.length;
            const fieldCount = cls.fields.length;

            // Calculate god class score based on multiple factors
            const complexityScore = this.calculateClassComplexityScore(cls, lineCount, methodCount, fieldCount);

            let severity: CodeSmellIssue['severity'] = 'Low';
            let confidence = 60;

            if (lineCount >= this.THRESHOLDS.CLASS_SIZE.LINES.CRITICAL || methodCount >= this.THRESHOLDS.CLASS_SIZE.METHODS.CRITICAL) {
                severity = 'Critical';
                confidence = 95;
            } else if (lineCount >= this.THRESHOLDS.CLASS_SIZE.LINES.HIGH || methodCount >= this.THRESHOLDS.CLASS_SIZE.METHODS.HIGH) {
                severity = 'High';
                confidence = 85;
            } else if (lineCount >= this.THRESHOLDS.CLASS_SIZE.LINES.MEDIUM || methodCount >= this.THRESHOLDS.CLASS_SIZE.METHODS.MEDIUM) {
                severity = 'Medium';
                confidence = 75;
            } else if (lineCount >= this.THRESHOLDS.CLASS_SIZE.LINES.LOW || methodCount >= this.THRESHOLDS.CLASS_SIZE.METHODS.LOW) {
                severity = 'Low';
                confidence = 65;
            } else {
                continue;
            }

            issues.push({
                type: 'GodClass',
                severity,
                confidence,
                description: `Class '${cls.name}' is too large with ${lineCount} lines and ${methodCount} methods`,
                recommendation: `Consider splitting this class into smaller, more cohesive classes following the Single Responsibility Principle. Extract related methods and fields into separate classes.`,
                filePath,
                className: cls.name,
                lineStart: cls.lineStart,
                lineEnd: cls.lineEnd,
                codeBlock: code.slice(cls.startIndex, cls.endIndex),
                metrics: {
                    lineCount,
                    methodCount,
                    fieldCount,
                    complexityScore,
                    cohesion: this.calculateCohesion(cls)
                }
            });
        }

        return issues;
    }

    private async detectDeepNesting(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const functions = this.extractFunctions(ast, language);

        for (const func of functions) {
            const maxNesting = this.calculateMaxNestingDepth(func.node, language);

            if (maxNesting <= this.THRESHOLDS.NESTING_DEPTH.LOW) continue;

            let severity: CodeSmellIssue['severity'] = 'Low';
            let confidence = 85;

            if (maxNesting >= this.THRESHOLDS.NESTING_DEPTH.CRITICAL) {
                severity = 'Critical';
                confidence = 98;
            } else if (maxNesting >= this.THRESHOLDS.NESTING_DEPTH.HIGH) {
                severity = 'High';
                confidence = 95;
            } else if (maxNesting >= this.THRESHOLDS.NESTING_DEPTH.MEDIUM) {
                severity = 'Medium';
                confidence = 90;
            }

            issues.push({
                type: 'DeepNesting',
                severity,
                confidence,
                description: `Method '${func.name}' has deep nesting with ${maxNesting} levels`,
                recommendation: `Reduce nesting by using early returns, extracting methods, or applying the guard clause pattern. Consider using polymorphism instead of complex conditionals.`,
                filePath,
                functionName: func.name,
                lineStart: func.lineStart,
                lineEnd: func.lineEnd,
                codeBlock: code.slice(func.startIndex, func.endIndex),
                metrics: {
                    maxNesting,
                    threshold: this.THRESHOLDS.NESTING_DEPTH.LOW
                }
            });
        }

        return issues;
    }

    private async detectLongParameterLists(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const functions = this.extractFunctions(ast, language);

        for (const func of functions) {
            const paramCount = func.parameters.length;

            if (paramCount <= this.THRESHOLDS.PARAMETER_COUNT.LOW) continue;

            let severity: CodeSmellIssue['severity'] = 'Low';
            let confidence = 80;

            if (paramCount >= this.THRESHOLDS.PARAMETER_COUNT.CRITICAL) {
                severity = 'Critical';
                confidence = 95;
            } else if (paramCount >= this.THRESHOLDS.PARAMETER_COUNT.HIGH) {
                severity = 'High';
                confidence = 90;
            } else if (paramCount >= this.THRESHOLDS.PARAMETER_COUNT.MEDIUM) {
                severity = 'Medium';
                confidence = 85;
            }

            issues.push({
                type: 'LongParameterList',
                severity,
                confidence,
                description: `Method '${func.name}' has too many parameters (${paramCount})`,
                recommendation: `Consider using parameter objects, builder pattern, or method overloading to reduce the number of parameters. Group related parameters into objects.`,
                filePath,
                functionName: func.name,
                lineStart: func.lineStart,
                lineEnd: func.lineEnd,
                codeBlock: code.slice(func.startIndex, func.endIndex),
                metrics: {
                    parameterCount: paramCount,
                    parameters: func.parameters,
                    threshold: this.THRESHOLDS.PARAMETER_COUNT.LOW
                }
            });
        }

        return issues;
    }

    private async detectEnhancedComplexity(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const functions = this.extractFunctions(ast, language);

        for (const func of functions) {
            const cyclomaticComplexity = this.calculateCyclomaticComplexity(func.node, language, code);
            const cognitiveComplexity = this.calculateCognitiveComplexity(func.node, language, code);

            // Check cyclomatic complexity
            if (cyclomaticComplexity > this.THRESHOLDS.CYCLOMATIC_COMPLEXITY.LOW) {
                let severity: CodeSmellIssue['severity'] = 'Low';
                let confidence = 85;

                if (cyclomaticComplexity >= this.THRESHOLDS.CYCLOMATIC_COMPLEXITY.CRITICAL) {
                    severity = 'Critical';
                    confidence = 98;
                } else if (cyclomaticComplexity >= this.THRESHOLDS.CYCLOMATIC_COMPLEXITY.HIGH) {
                    severity = 'High';
                    confidence = 95;
                } else if (cyclomaticComplexity >= this.THRESHOLDS.CYCLOMATIC_COMPLEXITY.MEDIUM) {
                    severity = 'Medium';
                    confidence = 90;
                }

                issues.push({
                    type: 'HighComplexity',
                    severity,
                    confidence,
                    description: `Method '${func.name}' has high cyclomatic complexity (${cyclomaticComplexity})`,
                    recommendation: `Reduce complexity by breaking down the method into smaller methods, using polymorphism, or simplifying conditional logic.`,
                    filePath,
                    functionName: func.name,
                    lineStart: func.lineStart,
                    lineEnd: func.lineEnd,
                    codeBlock: code.slice(func.startIndex, func.endIndex),
                    metrics: {
                        cyclomaticComplexity,
                        cognitiveComplexity,
                        threshold: this.THRESHOLDS.CYCLOMATIC_COMPLEXITY.LOW
                    }
                });
            }

            // Check cognitive complexity
            if (cognitiveComplexity > this.THRESHOLDS.COGNITIVE_COMPLEXITY.LOW) {
                let severity: CodeSmellIssue['severity'] = 'Low';
                let confidence = 80;

                if (cognitiveComplexity >= this.THRESHOLDS.COGNITIVE_COMPLEXITY.CRITICAL) {
                    severity = 'Critical';
                    confidence = 95;
                } else if (cognitiveComplexity >= this.THRESHOLDS.COGNITIVE_COMPLEXITY.HIGH) {
                    severity = 'High';
                    confidence = 90;
                } else if (cognitiveComplexity >= this.THRESHOLDS.COGNITIVE_COMPLEXITY.MEDIUM) {
                    severity = 'Medium';
                    confidence = 85;
                }

                issues.push({
                    type: 'CognitiveComplexity',
                    severity,
                    confidence,
                    description: `Method '${func.name}' has high cognitive complexity (${cognitiveComplexity})`,
                    recommendation: `Simplify the method by reducing nested conditions, extracting complex expressions, and using more descriptive variable names.`,
                    filePath,
                    functionName: func.name,
                    lineStart: func.lineStart,
                    lineEnd: func.lineEnd,
                    codeBlock: code.slice(func.startIndex, func.endIndex),
                    metrics: {
                        cyclomaticComplexity,
                        cognitiveComplexity,
                        threshold: this.THRESHOLDS.COGNITIVE_COMPLEXITY.LOW
                    }
                });
            }
        }

        return issues;
    }

    private async detectMagicNumbers(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const magicNumbers = this.findMagicNumbers(ast, code, language);

        for (const magic of magicNumbers) {
            issues.push({
                type: 'MagicNumber',
                severity: 'Medium',
                confidence: 75,
                description: `Magic number ${magic.value} found`,
                recommendation: `Replace magic number with a named constant that explains its purpose and meaning.`,
                filePath,
                lineStart: magic.lineStart,
                lineEnd: magic.lineEnd,
                codeBlock: magic.context,
                metrics: {
                    value: magic.value,
                    occurrences: magic.count,
                    context: magic.context
                }
            });
        }

        return issues;
    }

    private async detectDeadCode(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];

        // Detect unreachable code, unused variables, unused imports
        const deadCodeBlocks = this.findDeadCode(ast, code, language);

        for (const deadCode of deadCodeBlocks) {
            issues.push({
                type: 'DeadCode',
                severity: deadCode.type === 'unreachable' ? 'High' : 'Medium',
                confidence: deadCode.confidence,
                description: `${deadCode.type} detected: ${deadCode.description}`,
                recommendation: `Remove unused code to improve maintainability and reduce codebase size.`,
                filePath,
                lineStart: deadCode.lineStart,
                lineEnd: deadCode.lineEnd,
                codeBlock: deadCode.code,
                metrics: {
                    deadCodeType: deadCode.type,
                    reason: deadCode.reason
                }
            });
        }

        return issues;
    }

    private async detectFeatureEnvy(ast: any, code: string, filePath: string, language: string): Promise<CodeSmellIssue[]> {
        const issues: CodeSmellIssue[] = [];
        const functions = this.extractFunctions(ast, language);

        for (const func of functions) {
            const externalCalls = this.countExternalMethodCalls(func.node, language, code);
            const localCalls = this.countLocalMethodCalls(func.node, language, code);

            // Feature envy: method uses more methods from other classes than its own
            if (externalCalls.total > localCalls && externalCalls.total > 3) {
                const enviedClass = externalCalls.mostUsedClass;

                issues.push({
                    type: 'FeatureEnvy',
                    severity: 'Medium',
                    confidence: 70,
                    description: `Method '${func.name}' shows feature envy towards class '${enviedClass}'`,
                    recommendation: `Consider moving this method to '${enviedClass}' or extract the envious part into a separate method in the appropriate class.`,
                    filePath,
                    functionName: func.name,
                    lineStart: func.lineStart,
                    lineEnd: func.lineEnd,
                    codeBlock: code.slice(func.startIndex, func.endIndex),
                    metrics: {
                        externalCalls: externalCalls.total,
                        localCalls,
                        enviedClass,
                        callDistribution: externalCalls.distribution
                    }
                });
            }
        }

        return issues;
    }

    // Helper methods for analysis

    private extractFunctions(ast: any, language: string): any[] {
        const functions: any[] = [];

        if (!ast?.rootNode) return functions;

        const functionTypes = this.getFunctionTypes(language);
        const walk = (node: any) => {
            if (!node) return;

            if (functionTypes.includes(node.type)) {
                const functionInfo = this.helperService.extractFunctionInfo(node, language);
                if (functionInfo) {
                    functions.push(functionInfo);
                }
            }

            // Walk children
            for (let i = 0; i < (node.namedChildCount ?? 0); i++) {
                walk(node.namedChild(i));
            }
        };

        walk(ast.rootNode);
        return functions;
    }

    private extractClasses(ast: any, language: string): any[] {
        const classes: any[] = [];

        if (!ast?.rootNode) return classes;

        const classTypes = this.getClassTypes(language);
        const walk = (node: any) => {
            if (!node) return;

            if (classTypes.includes(node.type)) {
                const classInfo = this.helperService.extractClassInfo(node, language);
                if (classInfo) {
                    classes.push(classInfo);
                }
            }

            for (let i = 0; i < (node.namedChildCount ?? 0); i++) {
                walk(node.namedChild(i));
            }
        };

        walk(ast.rootNode);
        return classes;
    }

    private getFunctionTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['function_declaration', 'method_definition', 'arrow_function', 'function_expression'],
            javascript: ['function_declaration', 'method_definition', 'arrow_function', 'function_expression'],
            python: ['function_definition', 'async_function_definition'],
            java: ['method_declaration', 'constructor_declaration'],
            cpp: ['function_definition', 'function_declarator']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    private getClassTypes(language: string): string[] {
        const types: Record<string, string[]> = {
            typescript: ['class_declaration', 'interface_declaration'],
            javascript: ['class_declaration'],
            python: ['class_definition'],
            java: ['class_declaration', 'interface_declaration'],
            cpp: ['class_specifier', 'struct_specifier']
        };

        return types[language.toLowerCase()] || types.typescript;
    }

    private extractFunctionInfo(node: any, language: string): any {
        return this.helperService.extractFunctionInfo(node, language);
    }

    private extractClassInfo(node: any, language: string): any {
        return this.helperService.extractClassInfo(node, language);
    }

    private calculateCyclomaticComplexity(node: any, language: string, code: string): number {
        let complexity = 1; // Base complexity

        const complexityNodes = this.getComplexityNodes(language);

        const walk = (n: any) => {
            if (!n) return;

            if (complexityNodes.includes(n.type)) {
                complexity++;
            }

            // Special handling for logical operators
            if (n.type === 'binary_expression' || n.type === 'BinaryExpression') {
                const text = code.slice(n.startIndex, n.endIndex);
                const logicalOps = (text.match(/&&|\|\|/g) || []).length;
                complexity += logicalOps;
            }

            for (let i = 0; i < (n.namedChildCount ?? 0); i++) {
                walk(n.namedChild(i));
            }
        };

        walk(node);
        return complexity;
    }

    private calculateCognitiveComplexity(node: any, language: string, code: string): number {
        let complexity = 0;
        let nestingLevel = 0;

        const cognitiveNodes = this.getCognitiveComplexityNodes(language);

        const walk = (n: any, currentNesting: number) => {
            if (!n) return;

            const nodeType = n.type;
            let increment = 0;
            let nestingIncrement = 0;

            // Different constructs have different cognitive loads
            if (cognitiveNodes.binary.includes(nodeType)) {
                increment = 1;
            } else if (cognitiveNodes.nesting.includes(nodeType)) {
                increment = 1 + currentNesting;
                nestingIncrement = 1;
            } else if (cognitiveNodes.jumping.includes(nodeType)) {
                increment = 1;
            }

            complexity += increment;

            for (let i = 0; i < (n.namedChildCount ?? 0); i++) {
                walk(n.namedChild(i), currentNesting + nestingIncrement);
            }
        };

        walk(node, 0);
        return complexity;
    }

    private calculateMaxNestingDepth(node: any, language: string): number {
        let maxDepth = 0;

        const nestingNodes = this.getNestingNodes(language);

        const walk = (n: any, currentDepth: number) => {
            if (!n) return;

            let newDepth = currentDepth;
            if (nestingNodes.includes(n.type)) {
                newDepth++;
                maxDepth = Math.max(maxDepth, newDepth);
            }

            for (let i = 0; i < (n.namedChildCount ?? 0); i++) {
                walk(n.namedChild(i), newDepth);
            }
        };

        walk(node, 0);
        return maxDepth;
    }

    private getComplexityNodes(language: string): string[] {
        const nodes: Record<string, string[]> = {
            typescript: ['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_clause', 'catch_clause', 'conditional_expression'],
            javascript: ['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_clause', 'catch_clause', 'conditional_expression'],
            python: ['if_statement', 'for_statement', 'while_statement', 'elif_clause', 'except_clause', 'conditional_expression'],
            java: ['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_clause', 'catch_clause'],
        };

        return nodes[language.toLowerCase()] || nodes.typescript;
    }

    private getCognitiveComplexityNodes(language: string) {
        return {
            binary: ['&&', '||'],
            nesting: ['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'try_statement'],
            jumping: ['break_statement', 'continue_statement', 'return_statement', 'throw_statement']
        };
    }

    private getNestingNodes(language: string): string[] {
        const nodes: Record<string, string[]> = {
            typescript: ['if_statement', 'for_statement', 'while_statement', 'try_statement', 'switch_statement', 'block'],
            javascript: ['if_statement', 'for_statement', 'while_statement', 'try_statement', 'switch_statement', 'block'],
            python: ['if_statement', 'for_statement', 'while_statement', 'try_statement', 'with_statement'],
            java: ['if_statement', 'for_statement', 'while_statement', 'try_statement', 'switch_statement', 'block'],
        };

        return nodes[language.toLowerCase()] || nodes.typescript;
    }

    private getLines(code: string, startIndex: number, endIndex: number): string[] {
        const text = code.slice(startIndex, endIndex);
        return text.split('\n');
    }

    private getLineNumber(code: string, index: number): number {
        return code.substring(0, index).split('\n').length;
    }

    private calculateClassComplexityScore(cls: any, lineCount: number, methodCount: number, fieldCount: number): number {
        // Weighted score based on multiple factors
        const lineWeight = 0.4;
        const methodWeight = 0.4;
        const fieldWeight = 0.2;

        const lineScore = Math.min(lineCount / 500, 1) * 100;
        const methodScore = Math.min(methodCount / 30, 1) * 100;
        const fieldScore = Math.min(fieldCount / 20, 1) * 100;

        return lineScore * lineWeight + methodScore * methodWeight + fieldScore * fieldWeight;
    }

    private calculateCohesion(cls: any): number {
        // Calculate LCOM (Lack of Cohesion of Methods) metric
        // This is a simplified implementation
        return 0.5; // Placeholder
    }

    private findMagicNumbers(ast: any, code: string, language: string): any[] {
        return this.helperService.findMagicNumbers(ast, code, language);
    }

    private findDeadCode(ast: any, code: string, language: string): any[] {
        return this.helperService.findDeadCode(ast, code, language);
    }

    private countExternalMethodCalls(node: any, language: string, code: string): any {
        return this.helperService.countExternalMethodCalls(node, language, code);
    }

    private countLocalMethodCalls(node: any, language: string, code: string): number {
        return this.helperService.countLocalMethodCalls(node, language, code);
    }

    private getMethodLengthRecommendation(codeLines: number, functionName: string, severity: CodeSmellIssue['severity']): string {
        const name = functionName.toLowerCase();

        // Context-aware recommendations
        if (name.includes('main') || name.includes('analyze') || name.includes('process')) {
            if (severity === 'Critical') {
                return `This orchestration method (${codeLines} lines) should be broken down. Extract major workflow steps into separate methods like '${functionName}Setup()', '${functionName}Processing()', and '${functionName}Cleanup()'.`;
            } else if (severity === 'High') {
                return `Consider extracting logical blocks from this workflow method into separate helper methods for better maintainability.`;
            } else {
                return `This method coordinates multiple operations. Consider extracting some logical blocks into helper methods.`;
            }
        } else if (name.includes('test') || name.includes('spec')) {
            return `Test methods can be longer, but consider breaking this into smaller test cases or using helper methods for setup/assertions.`;
        } else {
            switch (severity) {
                case 'Critical':
                    return `This method (${codeLines} lines) is very difficult to maintain. Break it into smaller, focused methods with single responsibilities.`;
                case 'High':
                    return `Consider breaking this method into smaller functions. Look for logical blocks that can be extracted.`;
                case 'Medium':
                    return `This method could benefit from extraction of some logical blocks into helper methods.`;
                default:
                    return `Consider extracting some logic into smaller helper methods for improved readability.`;
            }
        }
    }

    private async storeIssue(issue: CodeSmellIssue, projectId: number): Promise<void> {
        await this.prisma.issue.create({
            data: {
                projectId,
                filePath: issue.filePath,
                functionName: issue.functionName,
                className: issue.className,
                issueType: issue.type,
                severity: issue.severity,
                confidence: issue.confidence,
                description: issue.description,
                recommendation: issue.recommendation,
                lineStart: issue.lineStart,
                lineEnd: issue.lineEnd,
                metadata: issue.metrics,
                codeBlock: issue.codeBlock,
            },
        });
    }
}