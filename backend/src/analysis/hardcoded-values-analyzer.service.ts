import { Injectable } from '@nestjs/common';

export interface HardcodedValue {
    type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'ip' | 'path' | 'config';
    value: string;
    context: string;
    lineNumber: number;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    suggestion: string;
    category: 'Configuration' | 'BusinessLogic' | 'Security' | 'Infrastructure';
}

@Injectable()
export class HardcodedValuesAnalyzer {
    private readonly BUSINESS_LOGIC_PATTERNS = [
        // Common business constants that should be configurable
        { pattern: /(?:tax[_-]?rate|interest[_-]?rate|commission)\s*[=:]\s*([0-9.]+)/gi, category: 'BusinessLogic' as const, severity: 'High' as const },
        { pattern: /(?:max[_-]?attempts|retry[_-]?count|timeout)\s*[=:]\s*([0-9]+)/gi, category: 'Configuration' as const, severity: 'Medium' as const },
        { pattern: /(?:page[_-]?size|limit|batch[_-]?size)\s*[=:]\s*([0-9]+)/gi, category: 'Configuration' as const, severity: 'Medium' as const },
        { pattern: /(?:cache[_-]?ttl|expire[_-]?time)\s*[=:]\s*([0-9]+)/gi, category: 'Configuration' as const, severity: 'Medium' as const },
    ];

    private readonly INFRASTRUCTURE_PATTERNS = [
        // Infrastructure-related hardcoded values
        { pattern: /(?:port|host|server)\s*[=:]\s*([0-9]+|"[^"]+"|'[^']+')/gi, category: 'Infrastructure' as const, severity: 'High' as const },
        { pattern: /(?:database|db)[_-]?(?:name|host|port)\s*[=:]\s*("[^"]+"|'[^']+')/gi, category: 'Infrastructure' as const, severity: 'High' as const },
        { pattern: /(?:redis|memcache)[_-]?(?:host|port)\s*[=:]\s*("[^"]+"|'[^']+'|[0-9]+)/gi, category: 'Infrastructure' as const, severity: 'High' as const },
    ];

    private readonly CONFIGURATION_PATTERNS = [
        // General configuration values
        { pattern: /(?:default[_-]?)?(?:language|locale|timezone)\s*[=:]\s*("[^"]+"|'[^']+')/gi, category: 'Configuration' as const, severity: 'Medium' as const },
        { pattern: /(?:version|app[_-]?version)\s*[=:]\s*("[^"]+"|'[^']+')/gi, category: 'Configuration' as const, severity: 'Low' as const },
        { pattern: /(?:debug|verbose|log[_-]?level)\s*[=:]\s*(true|false|"[^"]+"|'[^']+')/gi, category: 'Configuration' as const, severity: 'Low' as const },
    ];

    private readonly STRING_LITERAL_PATTERNS = [
        // Large string literals that might be configuration
        { pattern: /"[^"]{50,}"/g, category: 'Configuration' as const, severity: 'Low' as const, description: 'Long string literal' },
        { pattern: /'[^']{50,}'/g, category: 'Configuration' as const, severity: 'Low' as const, description: 'Long string literal' },
    ];

    private readonly MAGIC_NUMBER_PATTERNS = [
        // Significant magic numbers (excluding common ones like 0, 1, 2, etc.)
        { pattern: /\b(360|180|90|720|1440|86400|3600|1000|10000|100000|1000000)\b/g, category: 'BusinessLogic' as const, severity: 'Medium' as const, description: 'Magic number' },
        { pattern: /\b(255|256|512|1024|2048|4096|8192)\b/g, category: 'Configuration' as const, severity: 'Low' as const, description: 'Technical constant' },
    ];

    private readonly COMMON_EXCLUSIONS = [
        // Common false positives to exclude
        /\b(0|1|2|3|4|5|10|100|200|404|500)\b/,
        /^(true|false|null|undefined)$/i,
        /^(get|set|post|put|delete|patch)$/i,
        /^(error|warning|info|debug)$/i,
        /test|spec|example|demo|sample/i,
    ];

    analyzeHardcodedValues(code: string, filePath: string): HardcodedValue[] {
        const hardcodedValues: HardcodedValue[] = [];
        const lines = code.split('\n');

        // Skip test files and configuration files
        if (this.shouldSkipFile(filePath)) {
            return hardcodedValues;
        }

        // Analyze business logic patterns
        hardcodedValues.push(...this.analyzePatterns(code, lines, this.BUSINESS_LOGIC_PATTERNS));
        
        // Analyze infrastructure patterns
        hardcodedValues.push(...this.analyzePatterns(code, lines, this.INFRASTRUCTURE_PATTERNS));
        
        // Analyze configuration patterns
        hardcodedValues.push(...this.analyzePatterns(code, lines, this.CONFIGURATION_PATTERNS));
        
        // Analyze string literals
        hardcodedValues.push(...this.analyzeStringLiterals(code, lines));
        
        // Analyze magic numbers
        hardcodedValues.push(...this.analyzeMagicNumbers(code, lines));

        return this.deduplicateAndRank(hardcodedValues);
    }

    private analyzePatterns(
        code: string, 
        lines: string[], 
        patterns: Array<{ pattern: RegExp; category: HardcodedValue['category']; severity: HardcodedValue['severity'] }>
    ): HardcodedValue[] {
        const results: HardcodedValue[] = [];

        for (const patternConfig of patterns) {
            const matches = code.matchAll(patternConfig.pattern);
            
            for (const match of matches) {
                if (!match.index || !match[1]) continue;
                
                const value = match[1].replace(/["']/g, '');
                if (this.isExcluded(value)) continue;
                
                const lineNumber = this.getLineNumber(code, match.index);
                const context = lines[lineNumber - 1]?.trim() || match[0];
                
                results.push({
                    type: this.determineValueType(value),
                    value: value,
                    context: context,
                    lineNumber: lineNumber,
                    severity: patternConfig.severity,
                    suggestion: this.generateSuggestion(value, patternConfig.category),
                    category: patternConfig.category
                });
            }
        }

        return results;
    }

    private analyzeStringLiterals(code: string, lines: string[]): HardcodedValue[] {
        const results: HardcodedValue[] = [];

        for (const patternConfig of this.STRING_LITERAL_PATTERNS) {
            const matches = code.matchAll(patternConfig.pattern);
            
            for (const match of matches) {
                if (!match.index) continue;
                
                const value = match[0].slice(1, -1); // Remove quotes
                if (this.isExcluded(value) || this.isLikelyCode(value)) continue;
                
                const lineNumber = this.getLineNumber(code, match.index);
                const context = lines[lineNumber - 1]?.trim() || match[0];
                
                // Only flag if it looks like configuration or user-facing text
                if (this.isLikelyConfiguration(value, context)) {
                    results.push({
                        type: 'string',
                        value: value.length > 100 ? value.substring(0, 100) + '...' : value,
                        context: context,
                        lineNumber: lineNumber,
                        severity: patternConfig.severity,
                        suggestion: 'Consider moving this string to a configuration file or constants module',
                        category: patternConfig.category
                    });
                }
            }
        }

        return results;
    }

    private analyzeMagicNumbers(code: string, lines: string[]): HardcodedValue[] {
        const results: HardcodedValue[] = [];

        for (const patternConfig of this.MAGIC_NUMBER_PATTERNS) {
            const matches = code.matchAll(patternConfig.pattern);
            
            for (const match of matches) {
                if (!match.index) continue;
                
                const value = match[0];
                const lineNumber = this.getLineNumber(code, match.index);
                const context = lines[lineNumber - 1]?.trim() || match[0];
                
                // Skip if it's in a comment or string
                if (this.isInCommentOrString(context, value)) continue;
                
                results.push({
                    type: 'number',
                    value: value,
                    context: context,
                    lineNumber: lineNumber,
                    severity: patternConfig.severity,
                    suggestion: `Replace magic number ${value} with a named constant that explains its meaning`,
                    category: patternConfig.category
                });
            }
        }

        return results;
    }

    private shouldSkipFile(filePath: string): boolean {
        const skipPatterns = [
            /\.(test|spec)\./i,
            /\/tests?\//i,
            /\/node_modules\//i,
            /\.(config|conf)\.(js|ts|json)$/i,
            /package\.json$/i,
            /\.env/i
        ];

        return skipPatterns.some(pattern => pattern.test(filePath));
    }

    private isExcluded(value: string): boolean {
        return this.COMMON_EXCLUSIONS.some(pattern => pattern.test(value));
    }

    private isLikelyCode(value: string): boolean {
        // Check if the string looks like code rather than configuration
        const codeIndicators = [
            /^function\s+/,
            /^class\s+/,
            /^import\s+/,
            /^export\s+/,
            /^const\s+/,
            /^let\s+/,
            /^var\s+/,
            /{\s*[\w\s:,]+\s*}/,  // Object-like structure
            /^\s*\/\//,           // Comment
            /^\s*\/\*/,           // Multi-line comment
        ];

        return codeIndicators.some(pattern => pattern.test(value));
    }

    private isLikelyConfiguration(value: string, context: string): boolean {
        const configIndicators = [
            /message|text|label|title|description/i,
            /error|warning|info|success/i,
            /template|format|pattern/i,
            /url|endpoint|path|route/i,
            /config|setting|option/i
        ];

        return configIndicators.some(pattern => 
            pattern.test(context) || pattern.test(value)
        );
    }

    private isInCommentOrString(context: string, value: string): boolean {
        const beforeValue = context.substring(0, context.indexOf(value));
        
        // Check if it's in a comment
        if (/\/\//.test(beforeValue) || /\/\*/.test(beforeValue)) {
            return true;
        }

        // Check if it's in a string (count quotes before the value)
        const singleQuotes = (beforeValue.match(/'/g) || []).length;
        const doubleQuotes = (beforeValue.match(/"/g) || []).length;
        
        return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1);
    }

    private determineValueType(value: string): HardcodedValue['type'] {
        if (/^\d+$/.test(value)) return 'number';
        if (/^(true|false)$/i.test(value)) return 'boolean';
        if (/^https?:\/\//.test(value)) return 'url';
        if (/^[^@]+@[^@]+\.[^@]+$/.test(value)) return 'email';
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return 'ip';
        if (/^[\/\\]/.test(value) || /^[A-Z]:[\/\\]/.test(value)) return 'path';
        
        return 'string';
    }

    private generateSuggestion(value: string, category: HardcodedValue['category']): string {
        const suggestions = {
            'Configuration': 'Move this value to a configuration file or environment variable',
            'BusinessLogic': 'Extract this business rule to a constants file or configuration system',
            'Security': 'Move sensitive values to secure configuration or environment variables',
            'Infrastructure': 'Use environment variables or deployment configuration for infrastructure settings'
        };

        return suggestions[category];
    }

    private getLineNumber(code: string, index: number): number {
        return code.substring(0, index).split('\n').length;
    }

    private deduplicateAndRank(hardcodedValues: HardcodedValue[]): HardcodedValue[] {
        // Remove duplicates based on value and line number
        const unique = hardcodedValues.filter((value, index, array) => 
            array.findIndex(v => v.value === value.value && v.lineNumber === value.lineNumber) === index
        );

        // Sort by severity and category importance
        const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        const categoryOrder = { 'Security': 4, 'BusinessLogic': 3, 'Infrastructure': 2, 'Configuration': 1 };

        return unique.sort((a, b) => {
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            
            return categoryOrder[b.category] - categoryOrder[a.category];
        });
    }
}