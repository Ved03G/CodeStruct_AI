import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { RefactoringService } from './refactoring.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/issues')
@UseGuards(AuthGuard)
export class RefactoringApiController {
  constructor(private readonly refactoringService: RefactoringService) {}

  @Post(':id/generate-fix')
  async generateFix(@Param('id') id: string) {
    const result = await this.refactoringService.generateFix(Number(id));
    return result;
  }
}
