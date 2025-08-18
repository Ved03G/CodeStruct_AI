import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
  const projects = await (this.prisma as any).project.findMany({
      include: { issues: true, user: true },
    });
  return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      language: p.language,
      issueSummary: {
        total: p.issues.length,
  highComplexity: p.issues.filter((i: any) => i.issueType === 'HighComplexity').length,
  duplicateCode: p.issues.filter((i: any) => i.issueType === 'DuplicateCode').length,
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
      files,
      issues: project.issues,
    };
  }
}
