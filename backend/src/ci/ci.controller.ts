import { Body, Controller, Post } from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service';

class AnalyzePrDto {
  repoUrl!: string;
  language!: string; // 'typescript' | 'python' | etc.
  branch?: string; // optional
  files?: string[]; // changed files relative paths
}

@Controller('ci')
export class CiController {
  constructor(private readonly analysis: AnalysisService) {}

  @Post('analyze-pr')
  async analyzePr(@Body() body: AnalyzePrDto) {
    const { repoUrl, language, files } = body;
    const result = await this.analysis.quickAnalyzeRepo(repoUrl, language, files);
    // Return a concise summary for commenting in PRs
    return {
      summary: {
        totalIssues: result.issues.length,
        highComplexity: result.issues.filter((i: any) => i.issueType === 'HighComplexity').length,
        duplicateCode: result.issues.filter((i: any) => i.issueType === 'DuplicateCode').length,
      },
      sample: result.issues.slice(0, 10),
      projectName: result.projectName,
    };
  }
}
