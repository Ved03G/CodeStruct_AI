import { Body, Controller, Post } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

class StartAnalysisDto {
  gitUrl!: string;
  language!: string;
}

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('start')
  async start(@Body() body: StartAnalysisDto) {
    const { gitUrl, language } = body;
    const projectId = await this.analysisService.startAnalysis(gitUrl, language);
    return { projectId };
  }
}
