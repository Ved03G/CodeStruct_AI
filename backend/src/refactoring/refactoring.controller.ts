import { Controller, Param, Post, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { RefactoringService } from './refactoring.service';
import { AIRefactoringService } from './ai-refactoring.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('issues')
@UseGuards(AuthGuard)
export class RefactoringController {
  constructor(
    private readonly refactoringService: RefactoringService,
    private readonly aiRefactoringService: AIRefactoringService,
  ) { }

  @Post(':id/generate-fix')
  async generateFix(@Param('id') id: string) {
    const result = await this.refactoringService.generateFix(Number(id));
    return result;
  }

  /**
   * Generate AI-powered refactoring suggestion
   */
  @Post(':id/ai-refactor')
  async generateAIRefactoring(@Param('id') id: string) {
    try {
      const suggestion = await this.aiRefactoringService.generateRefactoring(Number(id));
      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate refactoring suggestion',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get existing refactoring suggestion
   */
  @Get(':id/ai-refactor')
  async getAIRefactoring(@Param('id') id: string) {
    try {
      const suggestion = await this.aiRefactoringService.getRefactoringSuggestion(Number(id));
      
      if (!suggestion) {
        return {
          success: false,
          message: 'No refactoring suggestion found',
        };
      }

      return {
        success: true,
        data: suggestion,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch refactoring suggestion',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Accept a refactoring suggestion
   */
  @Post(':id/ai-refactor/accept')
  async acceptRefactoring(@Param('id') id: string) {
    try {
      await this.aiRefactoringService.acceptSuggestion(Number(id));
      return {
        success: true,
        message: 'Refactoring suggestion accepted',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to accept refactoring suggestion',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reject a refactoring suggestion
   */
  @Post(':id/ai-refactor/reject')
  async rejectRefactoring(@Param('id') id: string) {
    try {
      await this.aiRefactoringService.rejectSuggestion(Number(id));
      return {
        success: true,
        message: 'Refactoring suggestion rejected',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to reject refactoring suggestion',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
