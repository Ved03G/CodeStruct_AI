import { Body, Controller, Post, Get, Param, Req, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AnalysisService } from './analysis.service';
import { SecurityAnalysisService } from './security-analysis.service';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';

class StartAnalysisDto {
  @IsString()
  @IsNotEmpty()
  gitUrl!: string;

  @IsString()
  @IsOptional()
  language?: string;
}

@Controller('analysis')
@UseGuards(AuthGuard)
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly securityAnalysisService: SecurityAnalysisService
  ) { }

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  async start(@Body() body: StartAnalysisDto, @Req() req: Request) {
    const { gitUrl, language } = body || {} as any;
    if (!gitUrl) {
      throw new BadRequestException('gitUrl is required');
    }
    const user = (req as any).user;
    const projectId = await this.analysisService.startAnalysis(gitUrl, language, user.id);
    return { projectId, status: 'Analyzing' };
  }

  @Get('security/:projectId')
  async getSecuritySummary(@Param('projectId') projectId: string) {
    const summary = await this.securityAnalysisService.getSecuritySummary(parseInt(projectId));
    return summary;
  }
}
