import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly prisma: PrismaService, private readonly analysis: AnalysisService) { }

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

    // Load full file list from ProjectFile inventory (falls back to files from issues if empty)
    const inv = await (this.prisma as any).projectFile?.findMany?.({ where: { projectId: id } }) || [];
    const files = inv.length ? inv.map((f: any) => f.filePath) : Array.from(new Set(project.issues.map((i: any) => i.filePath)));
    const astFiles = await (this.prisma as any).fileAst?.findMany?.({ where: { projectId: id }, select: { filePath: true } }) || [];
    const astAvailable = new Set(astFiles.map((f: any) => f.filePath));

    return {
      id: project.id,
      name: project.name,
      language: project.language,
      status: project.status,
      files,
      fileInventory: inv,
      astFiles: Array.from(astAvailable),
      issues: project.issues,
    };
  }

  // Return the stored AST for a given file in a project
  @Get(':projectId/ast/*')
  async fileAst(@Param('projectId') projectId: string, @Param() params: any) {
    const id = Number(projectId);
    // params['0'] captures the wildcard after /ast/
    const relPath = decodeURIComponent(params['0'] || '');
    const row = await (this.prisma as any).fileAst?.findFirst?.({ where: { projectId: id, filePath: relPath } });
    if (!row) return { error: 'AST not found' };
    return { filePath: row.filePath, language: row.language, format: row.astFormat, ast: row.ast };
  }

  // Explicit endpoint to list files with support and AST flags
  @Get(':projectId/files')
  async listFiles(@Param('projectId') projectId: string) {
    const id = Number(projectId);
    const inv = await (this.prisma as any).projectFile?.findMany?.({ where: { projectId: id } }) || [];
    const ast = await (this.prisma as any).fileAst?.findMany?.({ where: { projectId: id }, select: { filePath: true } }) || [];
    const astSet = new Set(ast.map((a: any) => a.filePath));
    return inv.map((f: any) => ({ ...f, hasAst: astSet.has(f.filePath) }));
  }

  @Post(':projectId/reanalyze')
  async reanalyze(@Param('projectId') projectId: string, @Body() body: { language?: string }) {
    const id = Number(projectId);
    const project = await (this.prisma as any).project.findUnique({ where: { id } });
    if (!project) return { error: 'Not found' };
    await (this.prisma as any).project.update({ where: { id }, data: { status: 'Analyzing', analysisStage: 'cloning' } });
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
