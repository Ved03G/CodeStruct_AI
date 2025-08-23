import { Module } from '@nestjs/common';
import { CiController } from './ci.controller';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AnalysisModule, AuthModule],
  controllers: [CiController],
})
export class CiModule { }
