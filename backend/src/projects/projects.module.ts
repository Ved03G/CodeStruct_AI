import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [ProjectsController] })
export class ProjectsModule {}
