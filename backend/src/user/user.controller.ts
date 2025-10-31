import { Body, Controller, Delete, Get, Put, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    const userId = req.user.id;
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            projects: true,
          }
        }
      }
    });

    if (!user) {
      return { error: 'User not found' };
    }

    // Get statistics
    const issuesCount = await (this.prisma as any).issue.count({
      where: {
        project: {
          userId: userId
        }
      }
    });

    const refactoringsCount = await (this.prisma as any).refactoringSuggestion.count({
      where: {
        issue: {
          project: {
            userId: userId
          }
        }
      }
    });

    return {
      id: user.id,
      email: user.email,
      githubUsername: user.githubUsername,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      statistics: {
        projects: user._count.projects,
        issues: issuesCount,
        refactorings: refactoringsCount
      }
    };
  }

  @Put('profile')
  async updateProfile(@Request() req: any, @Body() body: { bio?: string }) {
    const userId = req.user.id;
    
    const updated = await (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        bio: body.bio
      }
    });

    return {
      success: true,
      profile: {
        bio: updated.bio
      }
    };
  }

  @Delete('account')
  async deleteAccount(@Request() req: any) {
    const userId = req.user.id;
    
    // Delete user (cascade will handle related records)
    await (this.prisma as any).user.delete({
      where: { id: userId }
    });

    return { success: true, message: 'Account deleted successfully' };
  }

  @Get('settings')
  async getSettings(@Request() req: any) {
    const userId = req.user.id;
    
    let settings = await (this.prisma as any).userSettings.findUnique({
      where: { userId: userId }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await (this.prisma as any).userSettings.create({
        data: {
          userId: userId,
          autoAnalysis: true,
          showComplexityWarnings: true,
          complexityThreshold: 3
        }
      });
    }

    return {
      autoAnalysis: settings.autoAnalysis,
      showComplexityWarnings: settings.showComplexityWarnings,
      complexityThreshold: settings.complexityThreshold
    };
  }

  @Put('settings')
  async updateSettings(
    @Request() req: any, 
    @Body() body: { autoAnalysis?: boolean; showComplexityWarnings?: boolean; complexityThreshold?: number }
  ) {
    const userId = req.user.id;
    
    const settings = await (this.prisma as any).userSettings.upsert({
      where: { userId: userId },
      update: {
        autoAnalysis: body.autoAnalysis,
        showComplexityWarnings: body.showComplexityWarnings,
        complexityThreshold: body.complexityThreshold
      },
      create: {
        userId: userId,
        autoAnalysis: body.autoAnalysis ?? true,
        showComplexityWarnings: body.showComplexityWarnings ?? true,
        complexityThreshold: body.complexityThreshold ?? 3
      }
    });

    return {
      success: true,
      settings: {
        autoAnalysis: settings.autoAnalysis,
        showComplexityWarnings: settings.showComplexityWarnings,
        complexityThreshold: settings.complexityThreshold
      }
    };
  }
}
