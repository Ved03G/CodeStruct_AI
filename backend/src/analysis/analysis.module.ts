import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ParserService } from '../parser/parser.service';

@Module({
  imports: [PrismaModule],
  providers: [AnalysisService, ParserService],
  exports: [AnalysisService],
  controllers: [AnalysisController],
})
export class AnalysisModule {}
