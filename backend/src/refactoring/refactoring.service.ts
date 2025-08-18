import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { ValidationService } from '../validation/validation.service';

@Injectable()
export class RefactoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: ValidationService,
  ) {}

  async generateFix(issueId: number) {
  const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: 'Issue not found' };

    // Construct prompt based on issue type
    const prompt = this.buildPrompt(issue.issueType, issue.codeBlock, issue.functionName ?? undefined);

    const suggestion = await this.callLlm(prompt);

    // Validate suggestion
    const validation = await this.validator.validate(issue.codeBlock, suggestion, 'typescript');

    if (!validation.isValid) {
      return { error: 'Generated fix failed validation' };
    }

    return { suggestedCode: suggestion };
  }

  private buildPrompt(issueType: string, code: string, functionName?: string) {
    if (issueType === 'HighComplexity') {
      return `You are an expert TypeScript refactoring assistant. Refactor the following function to reduce cyclomatic complexity. Keep the ORIGINAL function name${
        functionName ? ` (${functionName})` : ''
      } and signature exactly the same. Prefer extracting small, single-purpose helper functions. Return ONLY valid TypeScript code for the refactored function.\n\n` + code;
    }
    if (issueType === 'DuplicateCode') {
      return `You are an expert TypeScript refactoring assistant. Refactor the following code to remove duplication while keeping behavior identical. Preserve public function signatures. Return ONLY valid TypeScript code.\n\n` + code;
    }
    return `Improve and simplify the following TypeScript code without changing its behavior or its function signature(s). Return ONLY valid TypeScript code.\n\n` + code;
  }

  private async callLlm(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback: echo code for offline dev
      return prompt.split('\n').slice(-50).join('\n');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
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
