import { Body, Controller, Post, Req, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AnalysisService } from './analysis.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';

class StartAnalysisDto {
  @IsString()
  @IsNotEmpty()
  gitUrl!: string;

  @IsString()
  @IsNotEmpty()
  language!: string;
}

@Controller('analysis')
@UseGuards(AuthGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) { }

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  async start(@Body() body: StartAnalysisDto, @Req() req: Request) {
    const { gitUrl, language } = body || {} as any;
    if (!gitUrl || !language) {
      throw new BadRequestException('gitUrl and language are required');
    }
    const user = (req as any).user;
    const projectId = await this.analysisService.startAnalysis(gitUrl, language, user.id);
    return { projectId, status: 'Analyzing' };
  }
}
