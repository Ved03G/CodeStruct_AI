import { Module } from '@nestjs/common';
import { RefactoringService } from './refactoring.service';
import { RefactoringController } from './refactoring.controller';
import { AIRefactoringService } from './ai-refactoring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GitHubModule } from '../github/github.module';
import { ValidationModule } from '../validation/validation.module';

@Module({
  imports: [PrismaModule, AuthModule, GitHubModule, ValidationModule],
  providers: [RefactoringService, AIRefactoringService],
  controllers: [RefactoringController],
  exports: [RefactoringService, AIRefactoringService],
})
export class RefactoringModule { }
