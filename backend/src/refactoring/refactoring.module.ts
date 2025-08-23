import { Module } from '@nestjs/common';
import { RefactoringService } from './refactoring.service';
import { RefactoringController } from './refactoring.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ValidationModule } from '../validation/validation.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ValidationModule, AuthModule],
  providers: [RefactoringService],
  controllers: [RefactoringController],
})
export class RefactoringModule { }
