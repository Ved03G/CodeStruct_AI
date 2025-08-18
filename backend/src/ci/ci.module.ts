import { Module } from '@nestjs/common';
import { CiController } from './ci.controller';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [AnalysisModule],
  controllers: [CiController],
})
export class CiModule {}
