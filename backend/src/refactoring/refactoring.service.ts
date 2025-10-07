import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIRefactoringService } from './ai-refactoring.service';

@Injectable()
export class RefactoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRefactoringService: AIRefactoringService,
  ) { }

  async generateFix(issueId: number) {
    const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } });
    if (!issue) return { error: 'Issue not found' };

    // Check if we already have a refactoring suggestion for this issue
    const existingSuggestion = await (this.prisma as any).refactoringSuggestion.findFirst({
      where: { issueId: issueId },
      orderBy: { createdAt: 'desc' } // Get the most recent suggestion
    });

    if (existingSuggestion) {
      console.log(`[Refactoring] Using existing suggestion for issue ${issueId}`);
      return { 
        suggestedCode: existingSuggestion.refactoredCode, 
        refactoredCode: existingSuggestion.refactoredCode,
        status: existingSuggestion.status,
        isExisting: true
      };
    }

    console.log(`[Refactoring] Generating new suggestion for issue ${issueId}`);

    try {
      // Use AIRefactoringService for AI generation
      const suggestion = await this.aiRefactoringService.generateRefactoring(issueId);
      
      console.log(`[Refactoring] AI suggestion generated for issue ${issueId}`);

      // Return both keys for compatibility with different clients
      return { 
        suggestedCode: suggestion.refactoredCode, 
        refactoredCode: suggestion.refactoredCode,
        status: 'pending',
        isExisting: false
      };
    } catch (error: any) {
      console.error(`[Refactoring] Failed to generate suggestion for issue ${issueId}:`, error.message);
      return { error: error.message || 'Failed to generate AI suggestion' };
    }
  }

  async bulkGenerateFixes(issueIds: number[], projectId: number) {
    console.log(`[Bulk Refactoring] Starting bulk fix for ${issueIds.length} issues in project ${projectId}`);
    
    const results: Array<{
      issueId: number;
      success: boolean;
      suggestedCode?: string;
      error?: string;
      issueType?: string;
      filePath?: string;
    }> = [];

    // Process issues in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < issueIds.length; i += batchSize) {
      const batch = issueIds.slice(i, i + batchSize);
      console.log(`[Bulk Refactoring] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(issueIds.length / batchSize)}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (issueId) => {
        try {
          const result = await this.generateFix(issueId);
          const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } });
          
          if (result.error) {
            return {
              issueId,
              success: false,
              error: result.error,
              issueType: issue?.issueType,
              filePath: issue?.filePath,
            };
          }

          return {
            issueId,
            success: true,
            suggestedCode: result.suggestedCode,
            issueType: issue?.issueType,
            filePath: issue?.filePath,
          };
        } catch (error: any) {
          const issue = await (this.prisma as any).issue.findUnique({ where: { id: issueId } }).catch(() => null);
          return {
            issueId,
            success: false,
            error: error.message || 'Unknown error',
            issueType: issue?.issueType,
            filePath: issue?.filePath,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful to the API
      if (i + batchSize < issueIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Bulk Refactoring] Completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  async acceptRefactoringSuggestion(issueId: number) {
    console.log(`[Refactoring] Accepting suggestion for issue ${issueId}`);
    
    const suggestion = await (this.prisma as any).refactoringSuggestion.findFirst({
      where: { issueId: issueId },
      orderBy: { createdAt: 'desc' } // Get the most recent suggestion
    });

    if (!suggestion) {
      throw new Error('No refactoring suggestion found for this issue');
    }

    await (this.prisma as any).refactoringSuggestion.update({
      where: { id: suggestion.id },
      data: { status: 'accepted' }
    });

    return { success: true, status: 'accepted' };
  }

  async rejectRefactoringSuggestion(issueId: number) {
    console.log(`[Refactoring] Rejecting suggestion for issue ${issueId}`);
    
    const suggestion = await (this.prisma as any).refactoringSuggestion.findFirst({
      where: { issueId: issueId },
      orderBy: { createdAt: 'desc' } // Get the most recent suggestion
    });

    if (!suggestion) {
      throw new Error('No refactoring suggestion found for this issue');
    }

    await (this.prisma as any).refactoringSuggestion.update({
      where: { id: suggestion.id },
      data: { status: 'rejected' }
    });

    return { success: true, status: 'rejected' };
  }

  async getRefactoringSuggestion(issueId: number) {
    console.log(`[Service] Looking for suggestion for issueId: ${issueId}`);
    
    const suggestion = await (this.prisma as any).refactoringSuggestion.findFirst({
      where: { issueId: issueId },
      orderBy: { createdAt: 'desc' }, // Get the most recent suggestion
      include: { issue: true }
    });

    console.log(`[Service] Database query result for issueId ${issueId}:`, suggestion ? 'Found' : 'Not found');
    
    if (!suggestion) {
      console.log(`[Service] No suggestion found in database for issueId: ${issueId}`);
      return null;
    }

    console.log(`[Service] Found suggestion ${suggestion.id} for issue ${issueId}, status: ${suggestion.status}`);

    return {
      id: suggestion.id,
      issueId: suggestion.issueId,
      originalCode: suggestion.originalCode,
      refactoredCode: suggestion.refactoredCode,
      explanation: suggestion.explanation,
      status: suggestion.status,
      confidence: suggestion.confidence,
      createdAt: suggestion.createdAt,
      issue: {
        filePath: suggestion.issue.filePath,
        issueType: suggestion.issue.issueType,
        lineStart: suggestion.issue.lineStart,
        lineEnd: suggestion.issue.lineEnd
      }
    };
  }

  async regenerateAllSuggestions(projectId: number, forceRegenerate: boolean = false) {
    console.log(`[Refactoring] ${forceRegenerate ? 'Force regenerating' : 'Checking'} suggestions for project ${projectId}`);
    
    const issues = await (this.prisma as any).issue.findMany({
      where: { projectId: projectId }
    });

    if (forceRegenerate) {
      // Delete all existing suggestions for this project
      await (this.prisma as any).refactoringSuggestion.deleteMany({
        where: {
          issue: {
            projectId: projectId
          }
        }
      });
      console.log(`[Refactoring] Deleted existing suggestions for project ${projectId}`);
    }

    const issueIds = issues.map((issue: any) => issue.id);
    return await this.bulkGenerateFixes(issueIds, projectId);
  }
}
