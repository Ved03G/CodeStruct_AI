import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ParserService } from '../parser/parser.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AnalysisService, ParserService],
  exports: [AnalysisService],
  controllers: [AnalysisController],
})
export class AnalysisModule { }
