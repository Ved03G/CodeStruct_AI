import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RefactoringSuggestion {
    issueId: number;
    originalCode: string;
    refactoredCode: string;
    explanation: string;
    changes: Array<{
        type: 'add' | 'remove' | 'modify';
        lineNumber: number;
        content: string;
    }>;
    confidence: number;
}

@Injectable()
export class AIRefactoringService {
    private readonly genAI: GoogleGenerativeAI;
    private readonly model: any;

    constructor(private readonly prisma: PrismaService) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('GEMINI_API_KEY environment variable is not set');
        }
        this.genAI = new GoogleGenerativeAI(apiKey || '');
        // Using gemini-2.0-flash for free tier (fast and efficient)
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    /**
     * Generate AI-powered refactoring suggestion for a code issue
     */
    async generateRefactoring(issueId: number): Promise<RefactoringSuggestion> {
        // Fetch issue details from database
        const issue = await this.prisma.issue.findUnique({
            where: { id: issueId },
            include: { project: true }
        });

        if (!issue) {
            throw new Error(`Issue ${issueId} not found`);
        }

        // Skip LongMethod issues as per user request
        if (issue.issueType === 'LongMethod') {
            throw new Error('LongMethod issues are too large for automated refactoring');
        }

        // Generate context-aware prompt based on issue type
        const prompt = this.generatePrompt(issue);

        // Call Gemini API
        const refactoredCode = await this.callGemini(prompt, issue.codeBlock);

        // Parse and validate the response
        const suggestion = this.parseAIResponse(refactoredCode, issue);

        // Store suggestion in database
        await this.storeSuggestion(issueId, suggestion);

        return suggestion;
    }

    /**
     * Generate context-aware prompt based on issue type
     */
    private generatePrompt(issue: any): string {
        const baseContext = `You are an expert ${issue.project.language} developer specializing in code refactoring.
Your task is to refactor the following code to fix the identified issue while maintaining functional equivalence.

Issue Type: ${issue.issueType}
Severity: ${issue.severity}
Description: ${issue.description}
File: ${issue.filePath}
${issue.functionName ? `Function: ${issue.functionName}` : ''}
${issue.className ? `Class: ${issue.className}` : ''}

Recommendation: ${issue.recommendation}
`;

        const issueSpecificPrompt = this.getIssueSpecificPrompt(issue.issueType);

        return `${baseContext}

${issueSpecificPrompt}

IMPORTANT RULES:
1. Maintain the exact same functionality - no behavioral changes
2. Preserve all function signatures and interfaces
3. Keep variable names meaningful and consistent
4. Add brief comments explaining significant changes
5. Return ONLY the refactored code without explanations or markdown
6. Ensure the code is production-ready and follows best practices

Original Code:
\`\`\`${issue.project.language}
${issue.codeBlock}
\`\`\`

Provide the refactored code:`;
    }

    /**
     * Get issue-specific refactoring instructions
     */
    private getIssueSpecificPrompt(issueType: string): string {
        const prompts: Record<string, string> = {
            GodClass: 'Break down this class into smaller, focused classes following Single Responsibility Principle. Extract cohesive groups of methods and properties into separate classes.',

            DeepNesting: 'Reduce nesting depth by extracting nested logic into separate functions, using early returns (guard clauses), and simplifying conditional logic.',

            LongParameterList: 'Reduce the number of parameters by grouping related parameters into configuration objects or using the builder pattern.',

            HighComplexity: 'Simplify the complex logic by extracting conditional branches into separate well-named functions and reducing cyclomatic complexity.',

            CognitiveComplexity: 'Improve code readability by breaking down complex logic into simpler, self-documenting functions with clear names.',

            DuplicateCode: 'Extract the duplicated logic into a reusable function or method. Ensure the extracted function has a clear, descriptive name.',

            MagicNumber: 'Replace magic numbers with named constants that clearly explain their purpose and meaning.',

            DeadCode: 'Remove the unused code while ensuring no side effects or dependencies are broken.',

            FeatureEnvy: 'Move the method to the class it is most interested in, or extract the envious operations into the appropriate class.',
        };

        return prompts[issueType] || 'Refactor the code to address the identified issue while maintaining clarity and functionality.';
    }

    /**
     * Call Google Gemini API to generate refactored code
     */
    private async callGemini(prompt: string, originalCode: string): Promise<string> {
        try {
            const fullPrompt = `You are an expert software engineer specializing in code refactoring. You provide clean, maintainable, and functionally equivalent code improvements.

${prompt}`;

            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const refactoredCode = response.text();

            return this.cleanAIResponse(refactoredCode);
        } catch (error: any) {
            console.error('Gemini API error:', error.message);
            throw new Error(`Failed to generate refactoring: ${error.message}`);
        }
    }

    /**
     * Clean AI response by removing markdown code blocks
     */
    private cleanAIResponse(response: string): string {
        // Remove markdown code blocks
        let cleaned = response.replace(/```[\w]*\n/g, '').replace(/```/g, '');

        // Remove any explanatory text before or after the code
        const lines = cleaned.split('\n');
        const codeStart = lines.findIndex(line => line.trim() && !line.startsWith('//') && !line.startsWith('/*'));
        const codeEnd = lines.length - 1;

        return lines.slice(codeStart, codeEnd + 1).join('\n').trim();
    }

    /**
     * Parse AI response and create suggestion object
     */
    private parseAIResponse(refactoredCode: string, issue: any): RefactoringSuggestion {
        const originalLines = issue.codeBlock.split('\n');
        const refactoredLines = refactoredCode.split('\n');

        // Calculate simple diff
        const changes = this.calculateDiff(originalLines, refactoredLines);

        // Generate explanation
        const explanation = this.generateExplanation(issue, changes);

        return {
            issueId: issue.id,
            originalCode: issue.codeBlock,
            refactoredCode,
            explanation,
            changes,
            confidence: this.calculateConfidence(issue, refactoredCode),
        };
    }

    /**
     * Calculate diff between original and refactored code
     */
    private calculateDiff(originalLines: string[], refactoredLines: string[]): Array<any> {
        const changes: Array<any> = [];
        const maxLines = Math.max(originalLines.length, refactoredLines.length);

        for (let i = 0; i < maxLines; i++) {
            const original = originalLines[i];
            const refactored = refactoredLines[i];

            if (original !== refactored) {
                if (!original && refactored) {
                    changes.push({
                        type: 'add',
                        lineNumber: i + 1,
                        content: refactored,
                    });
                } else if (original && !refactored) {
                    changes.push({
                        type: 'remove',
                        lineNumber: i + 1,
                        content: original,
                    });
                } else {
                    changes.push({
                        type: 'modify',
                        lineNumber: i + 1,
                        content: refactored,
                    });
                }
            }
        }

        return changes;
    }

    /**
     * Generate human-readable explanation of changes
     */
    private generateExplanation(issue: any, changes: any[]): string {
        const changeCount = changes.length;
        const issueType = issue.issueType;

        const explanations: Record<string, string> = {
            GodClass: `Refactored the large class into ${Math.ceil(changeCount / 10)} smaller, focused classes with clear responsibilities.`,
            DeepNesting: `Reduced nesting depth by extracting ${changeCount} lines into separate functions and using early returns.`,
            LongParameterList: `Simplified the function signature by grouping parameters into a configuration object.`,
            HighComplexity: `Reduced cyclomatic complexity by extracting ${Math.ceil(changeCount / 5)} conditional branches into helper functions.`,
            CognitiveComplexity: `Improved readability by breaking down complex logic into ${Math.ceil(changeCount / 8)} self-documenting functions.`,
            DuplicateCode: `Extracted duplicated logic into a reusable function, eliminating ${changeCount} redundant lines.`,
            MagicNumber: `Replaced magic numbers with named constants for better clarity and maintainability.`,
            DeadCode: `Removed ${changeCount} lines of unused code.`,
            FeatureEnvy: `Moved method to the appropriate class to improve cohesion.`,
        };

        return explanations[issueType] || `Applied ${changeCount} changes to address the ${issueType} issue.`;
    }

    /**
     * Calculate confidence score for the refactoring
     */
    private calculateConfidence(issue: any, refactoredCode: string): number {
        let confidence = 70; // Base confidence

        // Increase confidence for simpler issues
        const simpleIssues = ['MagicNumber', 'DeadCode', 'DuplicateCode'];
        if (simpleIssues.includes(issue.issueType)) {
            confidence += 20;
        }

        // Decrease confidence for complex issues
        const complexIssues = ['GodClass', 'FeatureEnvy', 'HighComplexity'];
        if (complexIssues.includes(issue.issueType)) {
            confidence -= 10;
        }

        // Adjust based on code size
        const lineCount = refactoredCode.split('\n').length;
        if (lineCount < 20) {
            confidence += 5;
        } else if (lineCount > 50) {
            confidence -= 10;
        }

        return Math.max(50, Math.min(95, confidence));
    }

    /**
     * Store refactoring suggestion in database
     */
    private async storeSuggestion(issueId: number, suggestion: RefactoringSuggestion): Promise<void> {
        try {
            await this.prisma.refactoringSuggestion.create({
                data: {
                    issueId,
                    originalCode: suggestion.originalCode,
                    refactoredCode: suggestion.refactoredCode,
                    explanation: suggestion.explanation,
                    confidence: suggestion.confidence,
                    status: 'pending',
                    changes: suggestion.changes as any,
                },
            });
        } catch (error) {
            console.error('Failed to store refactoring suggestion:', error);
        }
    }

    /**
     * Get existing refactoring suggestion for an issue
     */
    async getRefactoringSuggestion(issueId: number): Promise<RefactoringSuggestion | null> {
        const suggestion = await this.prisma.refactoringSuggestion.findFirst({
            where: { issueId },
            orderBy: { createdAt: 'desc' },
        });

        if (!suggestion) {
            return null;
        }

        return {
            issueId: suggestion.issueId,
            originalCode: suggestion.originalCode,
            refactoredCode: suggestion.refactoredCode,
            explanation: suggestion.explanation,
            changes: suggestion.changes as any,
            confidence: suggestion.confidence,
        };
    }

    /**
     * Accept a refactoring suggestion
     */
    async acceptSuggestion(issueId: number): Promise<void> {
        await this.prisma.refactoringSuggestion.updateMany({
            where: { issueId },
            data: { status: 'accepted' },
        });
    }

    /**
     * Reject a refactoring suggestion
     */
    async rejectSuggestion(issueId: number): Promise<void> {
        await this.prisma.refactoringSuggestion.updateMany({
            where: { issueId },
            data: { status: 'rejected' },
        });
    }
}
