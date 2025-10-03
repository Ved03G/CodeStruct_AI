import { Controller, Param, Post, Get, UseGuards, HttpException, HttpStatus, Body, Request } from '@nestjs/common';
import { RefactoringService } from './refactoring.service';
import { AIRefactoringService } from './ai-refactoring.service';
import { GitHubPRService } from '../github/github-pr.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('issues')
@UseGuards(AuthGuard)
export class RefactoringController {
  constructor(
    private readonly refactoringService: RefactoringService,
    private readonly aiRefactoringService: AIRefactoringService,
    private readonly githubPRService: GitHubPRService,
  ) { }

  @Post(':id/generate-fix')
  async generateFix(@Param('id') id: string) {
    const result = await this.refactoringService.generateFix(Number(id));
    return result;
  }

  /**
   * Bulk fix multiple issues at once
   */
  @Post('bulk/generate-fixes')
  async bulkGenerateFixes(@Body() body: { issueIds: number[]; projectId: number }) {
    console.log('Bulk generate fixes endpoint called with:', body);
    
    try {
      const results = await this.refactoringService.bulkGenerateFixes(body.issueIds, body.projectId);
      console.log('Bulk generate fixes completed, results:', results.length);
      
      return {
        success: true,
        results: results,
        summary: {
          total: body.issueIds.length,
          successful: results.filter((r: any) => r.success).length,
          failed: results.filter((r: any) => !r.success).length,
        }
      };
    } catch (error: any) {
      console.error('Bulk generate fixes error:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate bulk fixes',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  /**
   * Accept multiple refactorings and optionally create PR
   */
  @Post('bulk/accept-all')
  async acceptAllRefactorings(
    @Request() req: any,
    @Body() body: { 
      projectId: number; 
      acceptedIssueIds: number[];
      createPR?: boolean;
    }
  ) {
    try {
      console.log('Accept all refactorings called with:', body);
      
      // 1. Get accepted refactorings data
      const acceptedRefactorings = await this.getAcceptedRefactoringsData(body.acceptedIssueIds);
      
      // 2. Mark all suggestions as accepted in database
      await this.markRefactoringsAsAccepted(body.acceptedIssueIds);
      
      // 3. If user wants to create PR, do it
      if (body.createPR && acceptedRefactorings.length > 0) {
        const prResult = await this.githubPRService.createRefactoringPR(
          req.user.id,
          body.projectId,
          acceptedRefactorings
        );
        
        return {
          success: true,
          message: 'Refactorings accepted and PR created successfully',
          pullRequest: prResult.pullRequest,
          stats: {
            refactoringsApplied: prResult.refactoringsApplied,
            filesModified: prResult.filesModified,
          }
        };
      }

      return { 
        success: true, 
        message: 'Refactorings accepted successfully',
        stats: {
          refactoringsApplied: acceptedRefactorings.length,
        }
      };
    } catch (error: any) {
      console.error('Accept all refactorings error:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to accept refactorings',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getAcceptedRefactoringsData(issueIds: number[]) {
    // Get AI refactoring data for accepted issues
    const refactorings = [];
    
    for (const issueId of issueIds) {
      try {
        const suggestion = await this.aiRefactoringService.getRefactoringSuggestion(issueId);
        if (suggestion) {
          // Get issue details for file path and issue type
          const issue = await this.refactoringService['prisma'].issue.findUnique({
            where: { id: issueId }
          });
          
          if (issue) {
            refactorings.push({
              issueId: issueId,
              filePath: issue.filePath,
              originalCode: suggestion.originalCode,
              refactoredCode: suggestion.refactoredCode,
              issueType: issue.issueType,
              lineStart: issue.lineStart || 1,
              lineEnd: issue.lineEnd || 1,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to get refactoring data for issue ${issueId}:`, error);
        // Continue with other issues
      }
    }
    
    return refactorings;
  }

  private async markRefactoringsAsAccepted(issueIds: number[]) {
    // Mark AI refactoring suggestions as accepted
    for (const issueId of issueIds) {
      try {
        await this.aiRefactoringService.acceptSuggestion(issueId);
      } catch (error) {
        console.error(`Failed to mark issue ${issueId} as accepted:`, error);
        // Continue with other issues
      }
    }
  }
}
