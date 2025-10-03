import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { ValidationService } from '../validation/validation.service';

@Injectable()
export class RefactoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: ValidationService,
  ) { }

  async generateFix(issueId: number) {
    const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: 'Issue not found' };

    // Construct prompt based on issue type
    const lang = this.detectLanguage(issue.filePath);
    const prompt = this.buildPrompt(issue.issueType, issue.codeBlock, issue.functionName ?? undefined, lang);

    const suggestion = await this.callLlm(prompt);

    // Validate suggestion
    const validation = await this.validator.validate(issue.codeBlock, suggestion, /\.py$/i.test(issue.filePath) ? 'python' : 'typescript');

    if (!validation.isValid) {
      return { error: 'Generated fix failed validation' };
    }

    // Return both keys for compatibility with different clients
    return { suggestedCode: suggestion, refactoredCode: suggestion };
  }

  async bulkGenerateFixes(issueIds: number[], projectId: number) {
    console.log(`[Bulk Refactoring] Starting bulk fix for ${issueIds.length} issues in project ${projectId}`);
    
    const results: Array<{
      issueId: number;
      success: boolean;
      suggestedCode?: string;
      error?: string;
      issueType?: string;
      filePath?: string;
    }> = [];

    // Process issues in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < issueIds.length; i += batchSize) {
      const batch = issueIds.slice(i, i + batchSize);
      console.log(`[Bulk Refactoring] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(issueIds.length / batchSize)}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (issueId) => {
        try {
          const result = await this.generateFix(issueId);
          const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } });
          
          if (result.error) {
            return {
              issueId,
              success: false,
              error: result.error,
              issueType: issue?.issueType,
              filePath: issue?.filePath,
            };
          }

          return {
            issueId,
            success: true,
            suggestedCode: result.suggestedCode,
            issueType: issue?.issueType,
            filePath: issue?.filePath,
          };
        } catch (error: any) {
          const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } }).catch(() => null);
          return {
            issueId,
            success: false,
            error: error.message || 'Unknown error',
            issueType: issue?.issueType,
            filePath: issue?.filePath,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful to the API
      if (i + batchSize < issueIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Bulk Refactoring] Completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  private buildPrompt(issueType: string, code: string, functionName?: string, language: 'typescript' | 'python' = 'typescript') {
    const langName = language === 'python' ? 'Python' : 'TypeScript';
    if (issueType === 'HighComplexity') {
      return `You are an expert ${langName} refactoring assistant. Refactor the following function to reduce cyclomatic complexity. Keep the ORIGINAL function name${functionName ? ` (${functionName})` : ''
        } and signature exactly the same. Prefer extracting small, single-purpose helper functions. Return ONLY valid ${langName} code for the refactored function.\n\n` + code;
    }
    if (issueType === 'DuplicateCode') {
      return `You are an expert ${langName} refactoring assistant. Refactor the following code to remove duplication while keeping behavior identical. Preserve public function signatures. Return ONLY valid ${langName} code.\n\n` + code;
    }
    if (issueType === 'MagicNumber') {
      return `You are an expert ${langName} engineer. The following code contains one or more magic numbers. Replace each magic number with a well-named constant placed at the top of the file (or module). Infer descriptive names from context (e.g., ADMIN_ROLE_ID, MAX_LOGIN_ATTEMPTS). Do not change behavior or function signatures. Return ONLY the complete, refactored ${langName} code.\n\n` + code;
    }
    return `Improve and simplify the following ${langName} code without changing its behavior or its function signature(s). Return ONLY valid ${langName} code.\n\n` + code;
  }

  private detectLanguage(filePath?: string): 'typescript' | 'python' {
    if (!filePath) return 'typescript';
    return /\.py$/i.test(filePath) ? 'python' : 'typescript';
  }

  private async callLlm(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback: echo code for offline dev
      return prompt.split('\n').slice(-50).join('\n');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'You are a senior TypeScript refactoring assistant. Return ONLY valid TypeScript code. Do not include explanations or markdown fences.\n\n' +
                prompt,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2 },
    };

    const resp = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
    });

    const parts = resp.data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p.text || '').join('\n').trim();
    // Remove code fences if any
    const match = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : text;
  }
}
