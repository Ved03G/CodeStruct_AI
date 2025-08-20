import { Body, Controller, Post, Req, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { AnalysisService } from './analysis.service';
import { IsNotEmpty, IsString } from 'class-validator';

class StartAnalysisDto {
  @IsString()
  @IsNotEmpty()
  gitUrl!: string;

  @IsString()
  @IsNotEmpty()
  language!: string;
}

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  async start(@Body() body: StartAnalysisDto, @Req() req: Request) {
    const { gitUrl, language } = body || {} as any;
    if (!gitUrl || !language) {
      throw new BadRequestException('gitUrl and language are required');
    }
    const uid = req.cookies?.uid ? Number(req.cookies.uid) : undefined;
    const projectId = await this.analysisService.startAnalysis(gitUrl, language, uid);
    return { projectId, status: 'Analyzing' };
  }
}
