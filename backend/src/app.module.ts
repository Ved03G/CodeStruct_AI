import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AnalysisModule } from './analysis/analysis.module';
import { RefactoringModule } from './refactoring/refactoring.module';
import { ValidationModule } from './validation/validation.module';
import { ProjectsModule } from './projects/projects.module';
import { AuthModule } from './auth/auth.module';
import { CiModule } from './ci/ci.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AnalysisModule,
    RefactoringModule,
    ValidationModule,
    ProjectsModule,
    AuthModule,
    CiModule,
    UserModule,
  ],
})
export class AppModule {}
