import { Module } from '@nestjs/common';
import { RefactoringMirrorService } from './refactoring-mirror.service';

@Module({ 
  providers: [RefactoringMirrorService], 
  exports: [RefactoringMirrorService] 
})
export class ValidationModule {}
