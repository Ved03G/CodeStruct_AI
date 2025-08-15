import { Controller, Param, Post } from '@nestjs/common';
import { RefactoringService } from './refactoring.service';

@Controller('issues')
export class RefactoringController {
  constructor(private readonly refactoringService: RefactoringService) {}

  @Post(':id/generate-fix')
  async generateFix(@Param('id') id: string) {
    const result = await this.refactoringService.generateFix(Number(id));
    return result;
  }
}
