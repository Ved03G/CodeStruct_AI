import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({ imports: [PrismaModule, AnalysisModule], controllers: [ProjectsController] })
export class ProjectsModule {}
