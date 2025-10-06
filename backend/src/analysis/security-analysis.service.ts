import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HardcodedValuesAnalyzer, HardcodedValue } from './hardcoded-values-analyzer.service';

export interface SecurityIssue {
    type: 'HardcodedCredentials' | 'HardcodedUrls' | 'HardcodedSecrets' | 'SensitiveFile' | 'UnsafeLogging' | 'WeakEncryption' | 'HardcodedValues';
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    confidence: number;
    description: string;
    recommendation: string;
    filePath: string;
    functionName?: string;
    lineStart: number;
    lineEnd: number;
    codeBlock: string;
    metrics?: Record<string, any>;
}

@Injectable()
export class SecurityAnalysisService {
    private readonly HARDCODED_PATTERNS = [
        // Credentials
        { pattern: /(?:password|pwd|passwd)\s*[=:]\s*["']([^"']+)["']/gi, type: 'HardcodedCredentials' as const, severity: 'Critical' as const },
        { pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']([^"']+)["']/gi, type: 'HardcodedCredentials' as const, severity: 'Critical' as const },
        { pattern: /(?:secret|token)\s*[=:]\s*["']([^"']+)["']/gi, type: 'HardcodedCredentials' as const, severity: 'Critical' as const },
        { pattern: /(?:auth[_-]?token|access[_-]?token)\s*[=:]\s*["']([^"']+)["']/gi, type: 'HardcodedCredentials' as const, severity: 'Critical' as const },
        
        // Database credentials
        { pattern: /(?:db[_-]?password|database[_-]?password)\s*[=:]\s*["']([^"']+)["']/gi, type: 'HardcodedCredentials' as const, severity: 'Critical' as const },
        { pattern: /(?:mysql|postgres|mongodb)[_:]\/\/[^:]+:([^@]+)@/gi, type: 'HardcodedCredentials' as const, severity: 'Critical' as const },
        
        // URLs and endpoints
        { pattern: /(?:url|endpoint|host)\s*[=:]\s*["'](https?:\/\/[^"']+)["']/gi, type: 'HardcodedUrls' as const, severity: 'Medium' as const },
        { pattern: /(?:server|hostname)\s*[=:]\s*["']([^"']+\.[^"']+)["']/gi, type: 'HardcodedUrls' as const, severity: 'Medium' as const },
        
        // AWS/Cloud secrets
        { pattern: /AKIA[0-9A-Z]{16}/g, type: 'HardcodedSecrets' as const, severity: 'Critical' as const },
        { pattern: /[A-Za-z0-9+\/]{40}/g, type: 'HardcodedSecrets' as const, severity: 'High' as const },
        
        // Private keys
        { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, type: 'HardcodedSecrets' as const, severity: 'Critical' as const },
        
        // JWT tokens
        { pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, type: 'HardcodedSecrets' as const, severity: 'Critical' as const },
    ];

    private readonly SENSITIVE_FILES_PATTERNS = [
        { pattern: /\.env$/i, severity: 'High' as const, description: 'Environment configuration file' },
        { pattern: /\.env\.(local|dev|prod|production|staging)$/i, severity: 'High' as const, description: 'Environment-specific configuration' },
        { pattern: /config\.(js|ts|json|yml|yaml)$/i, severity: 'Medium' as const, description: 'Configuration file' },
        { pattern: /secrets?\.(js|ts|json|yml|yaml)$/i, severity: 'Critical' as const, description: 'Secrets configuration file' },
        { pattern: /\.key$/i, severity: 'Critical' as const, description: 'Private key file' },
        { pattern: /\.pem$/i, severity: 'Critical' as const, description: 'Certificate or private key file' },
        { pattern: /\.p12$/i, severity: 'Critical' as const, description: 'PKCS#12 certificate file' },
        { pattern: /\.keystore$/i, severity: 'Critical' as const, description: 'Java keystore file' },
        { pattern: /id_rsa$/i, severity: 'Critical' as const, description: 'SSH private key' },
        { pattern: /\.ppk$/i, severity: 'Critical' as const, description: 'PuTTY private key' },
        { pattern: /backup.*\.(sql|db|dump)$/i, severity: 'High' as const, description: 'Database backup file' },
        { pattern: /\.(log|logs)$/i, severity: 'Medium' as const, description: 'Log file (may contain sensitive data)' },
    ];

    private readonly UNSAFE_LOGGING_PATTERNS = [
        { pattern: /console\.log\([^)]*(?:password|token|secret|key)[^)]*\)/gi, severity: 'High' as const },
        { pattern: /logger?\.[^(]*\([^)]*(?:password|token|secret|key)[^)]*\)/gi, severity: 'High' as const },
        { pattern: /print\([^)]*(?:password|token|secret|key)[^)]*\)/gi, severity: 'High' as const },
        { pattern: /System\.out\.print[ln]?\([^)]*(?:password|token|secret|key)[^)]*\)/gi, severity: 'High' as const },
    ];

    private readonly WEAK_ENCRYPTION_PATTERNS = [
        { pattern: /MD5|SHA1/gi, severity: 'Medium' as const, description: 'Weak hashing algorithm detected' },
        { pattern: /DES|3DES/gi, severity: 'High' as const, description: 'Weak encryption algorithm detected' },
        { pattern: /RC4/gi, severity: 'High' as const, description: 'Weak encryption algorithm detected' },
        { pattern: /Math\.random\(\)/gi, severity: 'Medium' as const, description: 'Weak random number generation' },
    ];

    constructor(
        private readonly prisma: PrismaService,
        private readonly hardcodedValuesAnalyzer: HardcodedValuesAnalyzer
    ) {}

    async analyzeSecurityIssues(
        code: string,
        filePath: string,
        projectId: number
    ): Promise<SecurityIssue[]> {
        const issues: SecurityIssue[] = [];

        // Check for hardcoded credentials and secrets
        issues.push(...this.detectHardcodedSecrets(code, filePath));
        
        // Check for unsafe logging
        issues.push(...this.detectUnsafeLogging(code, filePath));
        
        // Check for weak encryption
        issues.push(...this.detectWeakEncryption(code, filePath));
        
        // Check for hardcoded values using the analyzer
        issues.push(...this.detectHardcodedValues(code, filePath));
        
        // Check if this is a sensitive file
        const sensitiveFileIssue = this.detectSensitiveFile(filePath);
        if (sensitiveFileIssue) {
            issues.push(sensitiveFileIssue);
        }

        // Store issues in database
        for (const issue of issues) {
            await this.storeSecurityIssue(issue, projectId);
        }

        return issues;
    }

    private detectHardcodedSecrets(code: string, filePath: string): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        const lines = code.split('\n');

        for (const patternConfig of this.HARDCODED_PATTERNS) {
            const matches = code.matchAll(patternConfig.pattern);
            
            for (const match of matches) {
                if (!match.index) continue;
                
                const lineNumber = this.getLineNumber(code, match.index);
                const confidence = this.calculateConfidence(match[0], patternConfig.type);
                
                // Skip common false positives
                if (this.isFalsePositive(match[0], filePath)) continue;

                issues.push({
                    type: patternConfig.type,
                    severity: patternConfig.severity,
                    confidence,
                    description: `${patternConfig.type} detected: ${this.maskSensitiveValue(match[0])}`,
                    recommendation: this.getRecommendation(patternConfig.type),
                    filePath,
                    lineStart: lineNumber,
                    lineEnd: lineNumber,
                    codeBlock: lines[lineNumber - 1]?.trim() || match[0],
                    metrics: {
                        matchedPattern: patternConfig.pattern.source,
                        matchedValue: this.maskSensitiveValue(match[0])
                    }
                });
            }
        }

        return issues;
    }

    private detectUnsafeLogging(code: string, filePath: string): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        const lines = code.split('\n');

        for (const patternConfig of this.UNSAFE_LOGGING_PATTERNS) {
            const matches = code.matchAll(patternConfig.pattern);
            
            for (const match of matches) {
                if (!match.index) continue;
                
                const lineNumber = this.getLineNumber(code, match.index);

                issues.push({
                    type: 'UnsafeLogging',
                    severity: patternConfig.severity,
                    confidence: 85,
                    description: 'Potential sensitive data being logged',
                    recommendation: 'Avoid logging sensitive information like passwords, tokens, or API keys. Use sanitization or redaction.',
                    filePath,
                    lineStart: lineNumber,
                    lineEnd: lineNumber,
                    codeBlock: lines[lineNumber - 1]?.trim() || match[0],
                    metrics: {
                        logStatement: this.maskSensitiveValue(match[0])
                    }
                });
            }
        }

        return issues;
    }

    private detectWeakEncryption(code: string, filePath: string): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        const lines = code.split('\n');

        for (const patternConfig of this.WEAK_ENCRYPTION_PATTERNS) {
            const matches = code.matchAll(patternConfig.pattern);
            
            for (const match of matches) {
                if (!match.index) continue;
                
                const lineNumber = this.getLineNumber(code, match.index);

                issues.push({
                    type: 'WeakEncryption',
                    severity: patternConfig.severity,
                    confidence: 90,
                    description: patternConfig.description || `Weak encryption/hashing detected: ${match[0]}`,
                    recommendation: this.getWeakEncryptionRecommendation(match[0]),
                    filePath,
                    lineStart: lineNumber,
                    lineEnd: lineNumber,
                    codeBlock: lines[lineNumber - 1]?.trim() || match[0],
                    metrics: {
                        algorithm: match[0]
                    }
                });
            }
        }

        return issues;
    }

    private detectSensitiveFile(filePath: string): SecurityIssue | null {
        for (const pattern of this.SENSITIVE_FILES_PATTERNS) {
            if (pattern.pattern.test(filePath)) {
                return {
                    type: 'SensitiveFile',
                    severity: pattern.severity,
                    confidence: 95,
                    description: `${pattern.description} detected: ${filePath}`,
                    recommendation: 'Ensure this file is not committed to version control and is properly secured.',
                    filePath,
                    lineStart: 1,
                    lineEnd: 1,
                    codeBlock: `File: ${filePath}`,
                    metrics: {
                        fileType: pattern.description
                    }
                };
            }
        }
        return null;
    }

    private detectHardcodedValues(code: string, filePath: string): SecurityIssue[] {
        const hardcodedValues = this.hardcodedValuesAnalyzer.analyzeHardcodedValues(code, filePath);
        
        return hardcodedValues.map(hv => ({
            type: 'HardcodedValues' as const,
            severity: hv.severity,
            confidence: 80,
            description: `Hardcoded ${hv.type} detected: ${hv.value}`,
            recommendation: hv.suggestion,
            filePath: hv.context,
            lineStart: hv.lineNumber,
            lineEnd: hv.lineNumber,
            codeBlock: hv.context,
            metrics: {
                valueType: hv.type,
                category: hv.category,
                originalValue: hv.value
            }
        }));
    }

    private calculateConfidence(match: string, type: string): number {
        let confidence = 70;

        // Higher confidence for longer secrets
        if (match.length > 32) confidence += 15;
        if (match.length > 64) confidence += 10;

        // Higher confidence for specific patterns
        if (type === 'HardcodedCredentials' && /password|secret|key|token/.test(match.toLowerCase())) {
            confidence += 15;
        }

        // Lower confidence for common words
        if (/test|example|demo|sample/.test(match.toLowerCase())) {
            confidence -= 20;
        }

        return Math.min(Math.max(confidence, 50), 95);
    }

    private isFalsePositive(match: string, filePath: string): boolean {
        const falsePositives = [
            /^(test|example|demo|sample|placeholder|dummy)/i,
            /^(your_|my_|insert_)/i,
            /^\*+$/,
            /^x+$/i,
            /^(true|false|null|undefined)$/i,
            /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/,
            /\.(test|spec|example)\./i // Test files
        ];

        // Check if it's a test file
        if (/\.(test|spec)\./.test(filePath) || /\/tests?\//.test(filePath)) {
            return true;
        }

        return falsePositives.some(pattern => pattern.test(match));
    }

    private maskSensitiveValue(value: string): string {
        if (value.length <= 6) return value;
        return value.substring(0, 3) + '*'.repeat(Math.max(value.length - 6, 3)) + value.substring(value.length - 3);
    }

    private getLineNumber(code: string, index: number): number {
        return code.substring(0, index).split('\n').length;
    }

    private getRecommendation(type: string): string {
        const recommendations = {
            'HardcodedCredentials': 'Move credentials to environment variables or secure configuration files. Use secrets management tools.',
            'HardcodedUrls': 'Move URLs to configuration files or environment variables for better flexibility and security.',
            'HardcodedSecrets': 'Remove hardcoded secrets immediately. Use environment variables or secure vaults like AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault.',
        };
        return recommendations[type as keyof typeof recommendations] || 'Review and secure this hardcoded value.';
    }

    private getWeakEncryptionRecommendation(algorithm: string): string {
        const recommendations = {
            'MD5': 'Replace MD5 with SHA-256 or SHA-3 for hashing.',
            'SHA1': 'Replace SHA-1 with SHA-256 or SHA-3 for better security.',
            'DES': 'Replace DES with AES-256 for encryption.',
            '3DES': 'Replace 3DES with AES-256 for better performance and security.',
            'RC4': 'Replace RC4 with modern encryption algorithms like AES.',
            'Math.random()': 'Use cryptographically secure random number generators like crypto.randomBytes() or window.crypto.getRandomValues().'
        };
        
        const key = Object.keys(recommendations).find(k => algorithm.toLowerCase().includes(k.toLowerCase()));
        return key ? recommendations[key as keyof typeof recommendations] : 'Replace with modern, secure cryptographic algorithms.';
    }

    private async storeSecurityIssue(issue: SecurityIssue, projectId: number): Promise<void> {
        try {
            await this.prisma.issue.create({
                data: {
                    projectId,
                    filePath: issue.filePath,
                    functionName: issue.functionName,
                    issueType: issue.type,
                    severity: issue.severity,
                    confidence: issue.confidence,
                    description: issue.description,
                    recommendation: issue.recommendation,
                    lineStart: issue.lineStart,
                    lineEnd: issue.lineEnd,
                    codeBlock: issue.codeBlock,
                    metadata: issue.metrics
                }
            });
        } catch (error) {
            console.error('Failed to store security issue:', error);
        }
    }

    async getSecuritySummary(projectId: number) {
        const issues = await this.prisma.issue.findMany({
            where: {
                projectId,
                issueType: {
                    in: ['HardcodedCredentials', 'HardcodedUrls', 'HardcodedSecrets', 'SensitiveFile', 'UnsafeLogging', 'WeakEncryption']
                }
            },
            select: {
                issueType: true,
                severity: true,
                confidence: true
            }
        });

        const summary = {
            totalIssues: issues.length,
            criticalIssues: issues.filter((i: any) => i.severity === 'Critical').length,
            highIssues: issues.filter((i: any) => i.severity === 'High').length,
            mediumIssues: issues.filter((i: any) => i.severity === 'Medium').length,
            lowIssues: issues.filter((i: any) => i.severity === 'Low').length,
            byType: issues.reduce((acc: any, issue: any) => {
                acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        return summary;
    }
}