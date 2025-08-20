import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService, private readonly analysis: AnalysisService) {}

  @Get()
  async list() {
  const projects = await (this.prisma as any).project.findMany({
      include: { issues: true, user: true },
    });
  return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      language: p.language,
  status: p.status,
      issueSummary: {
        total: p.issues.length,
  highComplexity: p.issues.filter((i: any) => i.issueType === 'HighComplexity').length,
  duplicateCode: p.issues.filter((i: any) => i.issueType === 'DuplicateCode').length,
  magicNumbers: p.issues.filter((i: any) => i.issueType === 'MagicNumber').length,
      },
    }));
  }

  @Get(':projectId')
  async details(@Param('projectId') projectId: string) {
    const id = Number(projectId);
  const project = await (this.prisma as any).project.findUnique({
      where: { id },
      include: { issues: true },
    });
    if (!project) return { error: 'Not found' };

    // Simple mock file tree based on issue file paths
  const files = Array.from(new Set(project.issues.map((i: any) => i.filePath)));

    return {
      id: project.id,
      name: project.name,
      language: project.language,
      status: project.status,
      files,
      issues: project.issues,
    };
  }

  @Post(':projectId/reanalyze')
  async reanalyze(@Param('projectId') projectId: string, @Body() body: { language?: string }) {
    const id = Number(projectId);
    const project = await (this.prisma as any).project.findUnique({ where: { id } });
    if (!project) return { error: 'Not found' };
    await (this.prisma as any).project.update({ where: { id }, data: { status: 'Analyzing' } });
    // Fire-and-forget using existing start logic
    await this.analysis.startAnalysis(project.gitUrl, body?.language || project.language, project.userId);
    return { ok: true };
  }

  @Post(':projectId/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async analyzeAlias(@Param('projectId') projectId: string, @Body() body: { language?: string }) {
    const id = Number(projectId);
    const project = await (this.prisma as any).project.findUnique({ where: { id } });
    if (!project) return { error: 'Not found' };
    await (this.prisma as any).project.update({ where: { id }, data: { status: 'Analyzing' } });
    await this.analysis.startAnalysis(project.gitUrl, body?.language || project.language, project.userId);
    return { projectId: id, status: 'Analyzing' };
  }
}
