import { Module } from '@nestjs/common';
import { GitHubPRService } from './github-pr.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GitHubPRService],
  exports: [GitHubPRService],
})
export class GitHubModule {}