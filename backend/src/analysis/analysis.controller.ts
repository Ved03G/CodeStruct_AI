import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AnalysisService } from './analysis.service';

class StartAnalysisDto {
  gitUrl!: string;
  language!: string;
}

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('start')
  async start(@Body() body: StartAnalysisDto, @Req() req: Request) {
    const { gitUrl, language } = body;
    const uid = req.cookies?.uid ? Number(req.cookies.uid) : undefined;
    const projectId = await this.analysisService.startAnalysis(gitUrl, language, uid);
    return { projectId };
  }
}
