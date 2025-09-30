import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DuplicateBlock {
    hash: string;
    normalizedCode: string;
    originalCode: string;
    filePath: string;
    startLine: number;
    endLine: number;
    startIndex: number;
    endIndex: number;
    tokenCount: number;
    similarity: number;
}

export interface DuplicateGroup {
    id: string;
    blocks: DuplicateBlock[];
    similarity: number;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    type: 'Exact' | 'Structural' | 'Semantic';
    totalLines: number;
    affectedFiles: string[];
}

@Injectable()
export class DuplicationDetectionService {
    private readonly MIN_DUPLICATE_LINES = 8;         // Increased: Need at least 8 meaningful lines
    private readonly MIN_DUPLICATE_TOKENS = 100;      // Increased: More tokens for real logic
    private readonly MIN_COMPLEXITY_SCORE = 5;        // New: Minimum complexity threshold
    private readonly SIMILARITY_THRESHOLD = 0.85;
    private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.75;

    /**
     * Advanced duplicate detection using multiple algorithms
     */
    async detectDuplicates(
        codeBlocks: Array<{ code: string; filePath: string; startIndex: number; endIndex: number; ast?: any }>,
        language: string
    ): Promise<DuplicateGroup[]> {
        const duplicateGroups: DuplicateGroup[] = [];

        // 1. Exact duplicates detection
        const exactDuplicates = this.detectExactDuplicates(codeBlocks);
        duplicateGroups.push(...exactDuplicates);

        // 2. Structural duplicates detection (normalized AST)
        const structuralDuplicates = this.detectStructuralDuplicates(codeBlocks, language);
        duplicateGroups.push(...structuralDuplicates);

        // 3. Semantic duplicates detection (token-based similarity)
        const semanticDuplicates = this.detectSemanticDuplicates(codeBlocks, language);
        duplicateGroups.push(...semanticDuplicates);

        // 4. Remove overlapping groups and return the best matches
        return this.deduplicateGroups(duplicateGroups);
    }

    /**
     * Detect exact code duplicates using line-by-line comparison
     */
    private detectExactDuplicates(codeBlocks: Array<{ code: string; filePath: string; startIndex: number; endIndex: number }>): DuplicateGroup[] {
        const groups: DuplicateGroup[] = [];
        const hashMap = new Map<string, DuplicateBlock[]>();

        for (const block of codeBlocks) {
            const lines = block.code.split('\n').filter(line => line.trim());

            if (lines.length < this.MIN_DUPLICATE_LINES) continue;

            // Create sliding windows of different sizes
            for (let windowSize = this.MIN_DUPLICATE_LINES; windowSize <= lines.length; windowSize++) {
                for (let i = 0; i <= lines.length - windowSize; i++) {
                    const window = lines.slice(i, i + windowSize);
                    const normalizedWindow = this.normalizeLines(window);
                    
                    // Skip if not enough meaningful lines after normalization
                    if (normalizedWindow.length < this.MIN_DUPLICATE_LINES) continue;
                    
                    // Check if this code block has sufficient complexity
                    const complexityScore = this.calculateCodeComplexity(normalizedWindow);
                    if (complexityScore < this.MIN_COMPLEXITY_SCORE) continue;
                    
                    const hash = this.hashLines(normalizedWindow);

                    const duplicateBlock: DuplicateBlock = {
                        hash,
                        normalizedCode: normalizedWindow.join('\n'),
                        originalCode: window.join('\n'),
                        filePath: block.filePath,
                        startLine: i + 1,
                        endLine: i + windowSize,
                        startIndex: block.startIndex,
                        endIndex: block.endIndex,
                        tokenCount: this.countTokens(window.join('\n')),
                        similarity: 1.0
                    };

                    if (!hashMap.has(hash)) {
                        hashMap.set(hash, []);
                    }
                    hashMap.get(hash)!.push(duplicateBlock);
                }
            }
        }

        // Create groups from hash map
        for (const [hash, blocks] of hashMap.entries()) {
            if (blocks.length > 1) {
                // Filter out blocks from the same file at similar positions
                const uniqueBlocks = this.filterSameFileOverlaps(blocks);

                if (uniqueBlocks.length > 1) {
                    groups.push({
                        id: `exact_${hash}`,
                        blocks: uniqueBlocks,
                        similarity: 1.0,
                        severity: this.calculateSeverity(uniqueBlocks),
                        type: 'Exact',
                        totalLines: uniqueBlocks[0].endLine - uniqueBlocks[0].startLine + 1,
                        affectedFiles: Array.from(new Set(uniqueBlocks.map(b => b.filePath)))
                    });
                }
            }
        }

        return groups;
    }

    /**
     * Detect structural duplicates using normalized AST comparison
     */
    private detectStructuralDuplicates(
        codeBlocks: Array<{ code: string; filePath: string; startIndex: number; endIndex: number; ast?: any }>,
        language: string
    ): DuplicateGroup[] {
        const groups: DuplicateGroup[] = [];
        const structuralMap = new Map<string, DuplicateBlock[]>();

        for (const block of codeBlocks) {
            if (this.countTokens(block.code) < this.MIN_DUPLICATE_TOKENS) continue;

            // Normalize the code structurally
            const normalizedStructure = this.normalizeCodeStructure(block.code, language);
            const structuralHash = this.hashString(normalizedStructure);

            const duplicateBlock: DuplicateBlock = {
                hash: structuralHash,
                normalizedCode: normalizedStructure,
                originalCode: block.code,
                filePath: block.filePath,
                startLine: this.getLineNumber(block.code, 0),
                endLine: this.getLineNumber(block.code, block.code.length),
                startIndex: block.startIndex,
                endIndex: block.endIndex,
                tokenCount: this.countTokens(block.code),
                similarity: 1.0
            };

            if (!structuralMap.has(structuralHash)) {
                structuralMap.set(structuralHash, []);
            }
            structuralMap.get(structuralHash)!.push(duplicateBlock);
        }

        // Create groups from structural similarities
        for (const [hash, blocks] of structuralMap.entries()) {
            if (blocks.length > 1) {
                const uniqueBlocks = this.filterSameFileOverlaps(blocks);

                if (uniqueBlocks.length > 1) {
                    groups.push({
                        id: `structural_${hash}`,
                        blocks: uniqueBlocks,
                        similarity: 1.0,
                        severity: this.calculateSeverity(uniqueBlocks),
                        type: 'Structural',
                        totalLines: Math.max(...uniqueBlocks.map(b => b.endLine - b.startLine + 1)),
                        affectedFiles: Array.from(new Set(uniqueBlocks.map(b => b.filePath)))
                    });
                }
            }
        }

        return groups;
    }

    /**
     * Detect semantic duplicates using token-based similarity
     */
    private detectSemanticDuplicates(
        codeBlocks: Array<{ code: string; filePath: string; startIndex: number; endIndex: number }>,
        language: string
    ): DuplicateGroup[] {
        const groups: DuplicateGroup[] = [];
        const blocks: DuplicateBlock[] = [];

        // Prepare blocks for comparison
        for (const block of codeBlocks) {
            if (this.countTokens(block.code) < this.MIN_DUPLICATE_TOKENS) continue;

            const tokens = this.tokenizeCode(block.code, language);
            const normalizedTokens = this.normalizeTokens(tokens);

            blocks.push({
                hash: this.hashString(normalizedTokens.join(' ')),
                normalizedCode: normalizedTokens.join(' '),
                originalCode: block.code,
                filePath: block.filePath,
                startLine: this.getLineNumber(block.code, 0),
                endLine: this.getLineNumber(block.code, block.code.length),
                startIndex: block.startIndex,
                endIndex: block.endIndex,
                tokenCount: tokens.length,
                similarity: 0
            });
        }

        // Compare all pairs for semantic similarity
        for (let i = 0; i < blocks.length; i++) {
            const similarBlocks: DuplicateBlock[] = [blocks[i]];

            for (let j = i + 1; j < blocks.length; j++) {
                // Skip same file comparisons if they overlap
                if (blocks[i].filePath === blocks[j].filePath &&
                    this.blocksOverlap(blocks[i], blocks[j])) {
                    continue;
                }

                const similarity = this.calculateTokenSimilarity(
                    blocks[i].normalizedCode.split(' '),
                    blocks[j].normalizedCode.split(' ')
                );

                if (similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD) {
                    blocks[j].similarity = similarity;
                    similarBlocks.push(blocks[j]);
                }
            }

            if (similarBlocks.length > 1) {
                const avgSimilarity = similarBlocks.reduce((sum, b) => sum + b.similarity, 1) / similarBlocks.length;

                groups.push({
                    id: `semantic_${this.hashString(similarBlocks.map(b => b.hash).join(''))}`,
                    blocks: similarBlocks,
                    similarity: avgSimilarity,
                    severity: this.calculateSeverity(similarBlocks),
                    type: 'Semantic',
                    totalLines: Math.max(...similarBlocks.map(b => b.endLine - b.startLine + 1)),
                    affectedFiles: Array.from(new Set(similarBlocks.map(b => b.filePath)))
                });

                // Remove processed blocks to avoid duplicate groups
                similarBlocks.slice(1).forEach(block => {
                    const index = blocks.indexOf(block);
                    if (index > -1) blocks.splice(index, 1);
                });
            }
        }

        return groups;
    }

    /**
     * Normalize code lines by removing whitespace and comments
     */
    private normalizeLines(lines: string[]): string[] {
        return lines.map(line => {
            return line
                .trim()
                .replace(/\/\/.*$/, '') // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//, '') // Remove multi-line comments
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/;$/, '') // Remove trailing semicolons
                .trim();
        }).filter(line => {
            // Filter out empty lines
            if (line.length === 0) return false;
            
            // Filter out common patterns that shouldn't be flagged as duplicates
            return !this.isCommonPattern(line);
        });
    }

    /**
     * Check if a line represents a common pattern that shouldn't be flagged as duplicate
     */
    private isCommonPattern(line: string): boolean {
        const trimmed = line.trim();
        
        // Skip import/export statements
        if (/^(import|export)\s/.test(trimmed)) return true;
        
        // Skip require statements
        if (/^(const|let|var)\s+.+\s*=\s*require\s*\(/.test(trimmed)) return true;
        
        // Skip common React patterns
        if (/^(import\s+React|from\s+['"]react['"]|useState|useEffect|useCallback|useMemo)/.test(trimmed)) return true;
        
        // Skip simple variable declarations with common patterns
        if (/^(const|let|var)\s+\w+\s*=\s*(true|false|null|undefined|\[\]|\{\})/.test(trimmed)) return true;
        
        // Skip simple return statements
        if (/^return\s+(true|false|null|undefined|\[\]|\{\})/.test(trimmed)) return true;
        
        // Skip common TypeScript/JavaScript patterns
        if (/^(interface|type|enum)\s+\w+/.test(trimmed)) return true;
        if (/^(public|private|protected)\s+/.test(trimmed)) return true;
        
        // Skip simple closing brackets/braces
        if (/^[\}\]\)],?\s*$/.test(trimmed)) return true;
        
        // Skip simple opening brackets/braces
        if (/^[\{\[\(]\s*$/.test(trimmed)) return true;
        
        // Skip very short lines (likely not meaningful duplicates)
        if (trimmed.length < 10) return true;
        
        return false;
    }

    /**
     * Normalize code structure by removing identifiers and literals
     */
    private normalizeCodeStructure(code: string, language: string): string {
        let normalized = code;

        // Remove comments
        normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
        normalized = normalized.replace(/\/\/.*$/gm, '');

        // Normalize string literals
        normalized = normalized.replace(/"([^"\\]|\\.)*"/g, '""');
        normalized = normalized.replace(/'([^'\\]|\\.)*'/g, "''");

        // Normalize numeric literals
        normalized = normalized.replace(/\b\d+\.?\d*\b/g, '0');

        // Normalize identifiers (keep keywords)
        const keywords = this.getLanguageKeywords(language);
        const tokens = normalized.split(/\s+/);

        normalized = tokens.map(token => {
            if (keywords.includes(token.toLowerCase()) ||
                /^[{}();,.\[\]<>!=+\-*/%&|^~?:]$/.test(token)) {
                return token;
            }
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
                return 'IDENTIFIER';
            }
            return token;
        }).join(' ');

        // Normalize whitespace
        normalized = normalized.replace(/\s+/g, ' ').trim();

        return normalized;
    }

    /**
     * Tokenize code into meaningful tokens
     */
    private tokenizeCode(code: string, language: string): string[] {
        // Simple tokenization - can be enhanced with proper lexer
        const tokens = code
            .replace(/\/\*[\s\S]*?\*\//g, ' ') // Remove multi-line comments
            .replace(/\/\/.*$/gm, ' ') // Remove single-line comments
            .replace(/[{}();,.\[\]<>!=+\-*/%&|^~?:]/g, ' $& ') // Separate operators
            .split(/\s+/)
            .filter(token => token.trim().length > 0);

        return tokens;
    }

    /**
     * Normalize tokens by replacing identifiers and literals
     */
    private normalizeTokens(tokens: string[]): string[] {
        return tokens.map(token => {
            // Keep operators and keywords
            if (/^[{}();,.\[\]<>!=+\-*/%&|^~?:]$/.test(token)) {
                return token;
            }

            // Normalize string literals
            if (/^["'].*["']$/.test(token)) {
                return 'STRING';
            }

            // Normalize numeric literals
            if (/^\d+\.?\d*$/.test(token)) {
                return 'NUMBER';
            }

            // Keep language keywords, normalize identifiers
            const keywords = ['if', 'else', 'for', 'while', 'function', 'class', 'return', 'var', 'let', 'const'];
            if (keywords.includes(token.toLowerCase())) {
                return token.toLowerCase();
            }

            // Normalize identifiers
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
                return 'ID';
            }

            return token;
        });
    }

    /**
     * Calculate similarity between two token arrays using Jaccard similarity
     */
    private calculateTokenSimilarity(tokens1: string[], tokens2: string[]): number {
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    /**
     * Calculate severity based on duplicate characteristics
     */
    private calculateSeverity(blocks: DuplicateBlock[]): 'Low' | 'Medium' | 'High' | 'Critical' {
        const maxLines = Math.max(...blocks.map(b => b.endLine - b.startLine + 1));
        const fileCount = new Set(blocks.map(b => b.filePath)).size;
        const avgTokens = blocks.reduce((sum, b) => sum + b.tokenCount, 0) / blocks.length;

        if (maxLines >= 50 || fileCount >= 5 || avgTokens >= 200) {
            return 'Critical';
        } else if (maxLines >= 30 || fileCount >= 3 || avgTokens >= 100) {
            return 'High';
        } else if (maxLines >= 15 || fileCount >= 2 || avgTokens >= 50) {
            return 'Medium';
        }

        return 'Low';
    }

    /**
     * Remove overlapping duplicate groups
     */
    private deduplicateGroups(groups: DuplicateGroup[]): DuplicateGroup[] {
        // Sort by severity and similarity
        groups.sort((a, b) => {
            const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return b.similarity - a.similarity;
        });

        const uniqueGroups: DuplicateGroup[] = [];
        const processedBlocks = new Set<string>();

        for (const group of groups) {
            const blockKeys = group.blocks.map(b => `${b.filePath}:${b.startIndex}:${b.endIndex}`);

            // Check if any block in this group has already been processed
            if (blockKeys.some(key => processedBlocks.has(key))) {
                continue;
            }

            // Add all blocks from this group to processed set
            blockKeys.forEach(key => processedBlocks.add(key));
            uniqueGroups.push(group);
        }

        return uniqueGroups;
    }

    /**
     * Filter out blocks that overlap in the same file
     */
    private filterSameFileOverlaps(blocks: DuplicateBlock[]): DuplicateBlock[] {
        const filtered: DuplicateBlock[] = [];

        for (const block of blocks) {
            const overlaps = filtered.some(existing =>
                existing.filePath === block.filePath &&
                this.blocksOverlap(existing, block)
            );

            if (!overlaps) {
                filtered.push(block);
            }
        }

        return filtered;
    }

    /**
     * Check if two blocks overlap
     */
    private blocksOverlap(block1: DuplicateBlock, block2: DuplicateBlock): boolean {
        return !(block1.endIndex <= block2.startIndex || block2.endIndex <= block1.startIndex);
    }

    /**
     * Utility functions
     */
    private hashLines(lines: string[]): string {
        return crypto.createHash('md5').update(lines.join('\n')).digest('hex');
    }

    private hashString(str: string): string {
        return crypto.createHash('md5').update(str).digest('hex');
    }

    private countTokens(code: string): number {
        return code.split(/\s+/).filter(token => token.trim().length > 0).length;
    }

    private getLineNumber(code: string, index: number): number {
        return code.substring(0, index).split('\n').length;
    }

    private getLanguageKeywords(language: string): string[] {
        const keywordMap: Record<string, string[]> = {
            typescript: ['abstract', 'any', 'as', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'declare', 'default', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'is', 'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'object', 'of', 'package', 'private', 'protected', 'public', 'readonly', 'return', 'static', 'string', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'],
            javascript: ['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'],
            python: ['and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'exec', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'not', 'or', 'pass', 'print', 'raise', 'return', 'try', 'while', 'with', 'yield'],
            java: ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while']
        };

        return keywordMap[language.toLowerCase()] || keywordMap.typescript;
    }

    /**
     * Calculate a simple complexity score for code lines
     * Higher scores indicate more complex/meaningful code
     */
    private calculateCodeComplexity(lines: string[]): number {
        let score = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Control flow adds complexity
            if (/\b(if|else|for|while|switch|case|try|catch|finally)\b/.test(trimmed)) {
                score += 3;
            }
            
            // Function calls add complexity  
            if (/\w+\s*\([^)]*\)/.test(trimmed)) {
                score += 2;
            }
            
            // Object/array operations add complexity
            if (/[\[\]{}]/.test(trimmed) && !/^[\s\[\]{}]*$/.test(trimmed)) {
                score += 1;
            }
            
            // Assignment operations add complexity
            if (/=/.test(trimmed) && !/^(const|let|var)\s+\w+\s*=\s*(true|false|null|undefined|\d+|""|'')/.test(trimmed)) {
                score += 1;
            }
            
            // Logical operators add complexity
            if (/(\|\||&&|!==|===|[<>]=?)/.test(trimmed)) {
                score += 2;
            }
            
            // Each meaningful word adds base complexity
            const meaningfulWords = trimmed.split(/\s+/).filter(word => 
                word.length > 2 && !/^(const|let|var|return|if|else)$/.test(word)
            );
            score += meaningfulWords.length * 0.5;
        }

        return score;
    }
}