import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';

@Module({ imports: [PrismaModule, AnalysisModule, AuthModule], controllers: [ProjectsController] })
export class ProjectsModule { }
