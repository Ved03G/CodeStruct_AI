import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { EnhancedAnalysisService } from './enhanced-analysis.service';
import { DuplicationDetectionService } from './duplication-detection.service';
import { AnalysisHelperService } from './analysis-helper.service';
import { SecurityAnalysisService } from './security-analysis.service';
import { HardcodedValuesAnalyzer } from './hardcoded-values-analyzer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ParserService } from '../parser/parser.service';
import { AuthModule } from '../auth/auth.module';
import { RefactoringModule } from '../refactoring/refactoring.module';
import { GitHubModule } from '../github/github.module';
import { ValidationModule } from '../validation/validation.module';

@Module({
  imports: [PrismaModule, AuthModule, RefactoringModule, GitHubModule, ValidationModule],
  providers: [
    AnalysisService,
    EnhancedAnalysisService,
    DuplicationDetectionService,
    AnalysisHelperService,
    SecurityAnalysisService,
    HardcodedValuesAnalyzer,
    ParserService
  ],
  exports: [AnalysisService],
  controllers: [AnalysisController],
})
export class AnalysisModule { }
