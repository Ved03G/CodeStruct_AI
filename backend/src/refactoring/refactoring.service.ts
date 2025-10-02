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
