import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from '@octokit/rest';

interface FileChange {
  path: string;
  content: string;
  originalContent: string;
}

interface RefactoringData {
  issueId: number;
  filePath: string;
  originalCode: string;
  refactoredCode: string;
  issueType: string;
  lineStart: number;
  lineEnd: number;
}

@Injectable()
export class GitHubPRService {
  constructor(private prisma: PrismaService) {}

  async createRefactoringPR(
    userId: number,
    projectId: number,
    acceptedRefactorings: RefactoringData[]
  ) {
    try {
      // 1. Get project and user information
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      console.log(`Project found: ${project.name}, gitUrl: ${project.gitUrl}`);
      console.log(`User: ${project.user.githubUsername}, has token: ${!!project.user.githubAccessToken}`);

      if (!project.user.githubAccessToken) {
        throw new Error('GitHub token not found for user');
      }

      // 2. Initialize Octokit with user's token
      const octokit = new Octokit({
        auth: project.user.githubAccessToken,
      });

      // 3. Extract repository owner and name from gitUrl
      // Example: https://github.com/Ved03G/CodeStruct_AI.git -> owner: Ved03G, repo: CodeStruct_AI
      console.log(`Git URL from database: ${project.gitUrl}`);
      
      const gitUrlMatch = project.gitUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (!gitUrlMatch) {
        console.error(`Failed to parse GitHub URL: ${project.gitUrl}`);
        throw new Error(`Invalid GitHub repository URL: ${project.gitUrl}`);
      }
      const repoOwner = gitUrlMatch[1];
      const repoName = gitUrlMatch[2];
      
      console.log(`Creating PR for repository: ${repoOwner}/${repoName}`);
      console.log(`Parsed owner: ${repoOwner}, repo: ${repoName}`);

      // 4. Create a new branch for refactoring
      const timestamp = Date.now();
      const branchName = `codestruct-refactoring-${timestamp}`;

      // Get the default branch SHA
      const { data: repoData } = await octokit.rest.repos.get({
        owner: repoOwner,
        repo: repoName,
      });

      const defaultBranch = repoData.default_branch;
      const { data: refData } = await octokit.rest.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
      });

      // Create new branch
      await octokit.rest.git.createRef({
        owner: repoOwner,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      });

      // 5. Build file changes by grouping refactorings by file
      const fileChanges = await this.buildFileChanges(
        octokit,
        repoOwner,
        repoName,
        acceptedRefactorings,
        branchName
      );

      // 6. Commit all changes to the new branch
      await this.commitChangesToBranch(
        octokit,
        repoOwner,
        repoName,
        branchName,
        fileChanges,
        acceptedRefactorings
      );

      // 7. Create pull request
      const prResult = await this.createPullRequest(
        octokit,
        repoOwner,
        repoName,
        branchName,
        defaultBranch,
        fileChanges,
        acceptedRefactorings
      );

      return {
        success: true,
        pullRequest: {
          url: prResult.html_url,
          number: prResult.number,
          branch: branchName,
        },
        filesModified: fileChanges.length,
        refactoringsApplied: acceptedRefactorings.length,
      };
    } catch (error: any) {
      console.error('Error creating PR:', error);
      throw new HttpException(
        `Failed to create pull request: ${error.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async buildFileChanges(
    octokit: Octokit,
    repoOwner: string,
    repoName: string,
    refactorings: RefactoringData[],
    branchName: string
  ): Promise<FileChange[]> {
    const fileChangesMap = new Map<string, FileChange>();

    for (const refactoring of refactorings) {
      const filePath = refactoring.filePath;

      if (!fileChangesMap.has(filePath)) {
        // Get original file content
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner: repoOwner,
            repo: repoName,
            path: filePath,
            ref: branchName,
          });

          if ('content' in fileData) {
            const originalContent = Buffer.from(fileData.content, 'base64').toString('utf8');
            fileChangesMap.set(filePath, {
              path: filePath,
              content: originalContent,
              originalContent: originalContent,
            });
          }
        } catch (error) {
          console.error(`Failed to get file content for ${filePath}:`, error);
          continue;
        }
      }

      // Apply refactoring to file content
      const fileChange = fileChangesMap.get(filePath);
      if (fileChange) {
        const updatedContent = this.applyRefactoringToFile(
          fileChange.content,
          refactoring
        );
        fileChange.content = updatedContent;
        fileChangesMap.set(filePath, fileChange);
      }
    }

    return Array.from(fileChangesMap.values());
  }

  private applyRefactoringToFile(
    fileContent: string,
    refactoring: RefactoringData
  ): string {
    const lines = fileContent.split('\n');
    
    // Find and replace the original code with refactored code
    // This is a simplified implementation - you might need more sophisticated matching
    const originalLines = refactoring.originalCode.split('\n');
    const refactoredLines = refactoring.refactoredCode.split('\n');

    // Simple line-by-line replacement
    // In a real implementation, you'd want more sophisticated code matching
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === originalLines[0]?.trim()) {
        // Check if we have a multi-line match
        let isMatch = true;
        for (let j = 0; j < originalLines.length; j++) {
          if (i + j >= lines.length || lines[i + j].trim() !== originalLines[j]?.trim()) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          // Replace the matched lines with refactored code
          lines.splice(i, originalLines.length, ...refactoredLines);
          break;
        }
      }
    }

    return lines.join('\n');
  }

  private async commitChangesToBranch(
    octokit: Octokit,
    repoOwner: string,
    repoName: string,
    branchName: string,
    fileChanges: FileChange[],
    refactorings: RefactoringData[]
  ) {
    for (const fileChange of fileChanges) {
      try {
        // Get current file SHA
        const { data: currentFile } = await octokit.rest.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: fileChange.path,
          ref: branchName,
        });

        if ('sha' in currentFile) {
          // Update file content
          await octokit.rest.repos.createOrUpdateFileContents({
            owner: repoOwner,
            repo: repoName,
            path: fileChange.path,
            message: `🤖 CodeStruct: Refactor ${fileChange.path}`,
            content: Buffer.from(fileChange.content).toString('base64'),
            sha: currentFile.sha,
            branch: branchName,
          });
        }
      } catch (error) {
        console.error(`Failed to update file ${fileChange.path}:`, error);
        // Continue with other files even if one fails
      }
    }
  }

  private async createPullRequest(
    octokit: Octokit,
    repoOwner: string,
    repoName: string,
    branchName: string,
    baseBranch: string,
    fileChanges: FileChange[],
    refactorings: RefactoringData[]
  ) {
    const prTitle = `🤖 CodeStruct AI Refactoring - ${fileChanges.length} files improved`;
    const prBody = this.generatePRDescription(fileChanges, refactorings);

    const { data: pr } = await octokit.rest.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title: prTitle,
      head: branchName,
      base: baseBranch,
      body: prBody,
    });

    return pr;
  }

  private generatePRDescription(
    fileChanges: FileChange[],
    refactorings: RefactoringData[]
  ): string {
    const issueTypeGroups = refactorings.reduce((acc, ref) => {
      acc[ref.issueType] = (acc[ref.issueType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesList = Object.entries(issueTypeGroups)
      .map(([type, count]) => `- ✅ Fixed ${count} ${type} issue${count > 1 ? 's' : ''}`)
      .join('\n');

    const filesList = fileChanges
      .map(fc => `- \`${fc.path}\``)
      .join('\n');

    return `## 🤖 CodeStruct AI Refactoring

### Summary
- **${refactorings.length} refactorings applied**
- **${fileChanges.length} files improved**
- **Automated code quality improvements**

### Issues Fixed
${issuesList}

### Files Modified
${filesList}

### About
This pull request was automatically generated by [CodeStruct AI](https://codestruct.ai) - an intelligent code analysis and refactoring platform.

**Review Process:**
1. All refactorings were generated using AI
2. Each suggestion was reviewed and accepted by the developer
3. Changes maintain functional equivalence while improving code quality

**Quality Assurance:**
- ✅ AI-generated refactorings
- ✅ Developer reviewed and approved
- ✅ Automated testing recommended before merge

---
*Generated by CodeStruct AI - Making codebases better, one refactoring at a time* 🚀`;
  }
}