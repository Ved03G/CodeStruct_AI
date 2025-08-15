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
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: echo code for offline dev
      return prompt.split('\n').slice(-50).join('\n');
    }

    // Placeholder OpenAI compatible call; replace with official SDK if desired
    const url = 'https://api.openai.com/v1/chat/completions';
    const resp = await axios.post(
      url,
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior TypeScript refactoring assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      },
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    const content: string = resp.data.choices?.[0]?.message?.content ?? '';
    // Extract code fences if present
    const match = content.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    return match ? match[1].trim() : content.trim();
  }
}
