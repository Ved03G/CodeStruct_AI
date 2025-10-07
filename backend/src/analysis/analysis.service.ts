import { Injectable } from '@nestjs/common';
import { ParserService } from '../parser/parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnhancedAnalysisService } from './enhanced-analysis.service';
import { DuplicationDetectionService } from './duplication-detection.service';
import { GitHubPRService } from '../github/github-pr.service';
import simpleGit from 'simple-git';
import { tmpdir } from 'os';
import { mkdtemp, readdir, readFile } from 'fs/promises';
import { join, extname, relative } from 'path';

@Injectable()
export class AnalysisService {
  private complexityThreshold = 3; // aggressive threshold for clearer findings

  // Holds current file's source during analysis pass
  private currentSourceText: string | undefined;

  // Optional local fallback TypeScript API for normalization
  private tsApi: any | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: ParserService,
    private readonly enhancedAnalysisService: EnhancedAnalysisService,
    private readonly duplicationDetectionService: DuplicationDetectionService,
    private readonly githubPRService: GitHubPRService,
  ) {
    const th = Number(process.env.ANALYSIS_COMPLEXITY_THRESHOLD);
    if (!Number.isNaN(th) && th > 0) this.complexityThreshold = th;
    // Try to load TypeScript API for AST-based fallback normalization
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.tsApi = require('typescript');
      if (process.env.ANALYSIS_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[analysis] TypeScript API available for AST fallback');
      }
    } catch {
      this.tsApi = undefined;
    }
  }

  private dlog(...args: any[]) {
    // Temporarily always log for deep debugging
    // eslint-disable-next-line no-console
    console.log('[analysis]', ...args);
  }

  async startAnalysis(gitUrl: string, language?: string, userId?: number): Promise<number> {
    this.dlog('startAnalysis called', { gitUrl, language, userId, threshold: this.complexityThreshold });
    // Create project or reuse existing
    const project = await (this.prisma as any).project.upsert({
      where: { gitUrl },
      update: { status: 'Analyzing' },
      create: {
        name: this.deriveProjectName(gitUrl),
        gitUrl,
        language: language || 'auto-detect',
        status: 'Analyzing',
        user: userId
          ? { connect: { id: userId } }
          : { create: { email: `${Date.now()}@placeholder.local` } },
      },
    });

    // If we have a logged-in user and GitHub URL, attempt token-authenticated clone for private repos
    let effectiveUrl = gitUrl;
    if (userId && /github\.com/.test(gitUrl)) {
      try {
        const user = await (this.prisma as any).user.findUnique({ where: { id: userId } });
        const token: string | undefined = user?.githubAccessToken;
        if (token) {
          // https://x-access-token:<token>@github.com/owner/repo.git
          const encoded = encodeURIComponent(token);
          effectiveUrl = gitUrl.replace(/^https:\/\//, `https://x-access-token:${encoded}@`);
        }
      } catch { }
    }

    // Async fire-and-forget analysis (no queue for demo)
    this.dlog('queue analyzeRepo', { effectiveUrl, language: language || 'auto-detect', projectId: project.id, userId });
    this.analyzeRepo(effectiveUrl, language || 'auto-detect', project.id, userId).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Analysis failed', err);
    });

    return project.id;
  }

  private deriveProjectName(gitUrl: string) {
    if (!gitUrl) return 'project';
    const name = gitUrl.split('/').pop() || 'project';
    return name.replace(/\.git$/, '');
  }

  // Automatically detect the primary language of a repository
  private async detectLanguage(dir: string): Promise<string> {
    try {
      const files = await this.collectFiles(dir);
      const extensionCounts = new Map<string, number>();

      // Count file extensions
      for (const file of files) {
        const ext = extname(file).toLowerCase();
        if (ext) {
          extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1);
        }
      }

      // Define language detection priorities
      const languageMap = {
        '.java': { language: 'java', priority: 12 },
        '.kt': { language: 'kotlin', priority: 11 },
        '.ts': { language: 'typescript', priority: 10 },
        '.tsx': { language: 'typescript', priority: 9 },
        '.js': { language: 'javascript', priority: 8 },
        '.jsx': { language: 'javascript', priority: 7 },
        '.py': { language: 'python', priority: 6 },
        '.cpp': { language: 'cpp', priority: 5 },
        '.c': { language: 'c', priority: 4 },
        '.cs': { language: 'csharp', priority: 3 },
        '.go': { language: 'go', priority: 2 },
        '.rs': { language: 'rust', priority: 1 },
      };

      let bestMatch = { language: 'typescript', score: 0 }; // default to typescript

      // Score each language based on file count and priority
      for (const [ext, count] of extensionCounts.entries()) {
        const mapping = languageMap[ext as keyof typeof languageMap];
        if (mapping) {
          const score = count * mapping.priority;
          if (score > bestMatch.score) {
            bestMatch = { language: mapping.language, score };
          }
        }
      }

      this.dlog('language detection', {
        extensionCounts: Object.fromEntries(extensionCounts),
        detected: bestMatch.language
      });

      return bestMatch.language;
    } catch (error) {
      this.dlog('language detection failed, defaulting to typescript', { error });
      return 'typescript';
    }
  }

  private async analyzeRepo(gitUrl: string, language: string, projectId: number, userId?: number) {
    this.dlog('analyzeRepo start', { gitUrl, language, projectId, userId });
    let dir: string | undefined;
    try {
      // Stage 1: Cloning
      await this.updateAnalysisStage(projectId, 'cloning');
      dir = await mkdtemp(join(tmpdir(), 'codestruct-'));
      const git = simpleGit();
      await git.clone(gitUrl, dir);
      this.dlog('cloned into', { dir });

      // Stage 2: Language Detection
      await this.updateAnalysisStage(projectId, 'detecting');
      // Auto-detect language if needed
      let detectedLanguage = language;
      if (language === 'auto-detect') {
        detectedLanguage = await this.detectLanguage(dir);
        this.dlog('detected language', { detectedLanguage });

        // Update project with detected language
        try {
          await (this.prisma as any).project.update({
            where: { id: projectId },
            data: { language: detectedLanguage }
          });
        } catch (err) {
          this.dlog('failed to update project language', err);
        }
      }

      // Reset existing issues for re-run scenarios (cascade deletes refactoring suggestions)
      await (this.prisma as any).issue.deleteMany({ where: { projectId } });
      await (this.prisma as any).fileAst?.deleteMany?.({ where: { projectId } }).catch(() => { });

      const files = await this.collectFiles(dir);
      this.dlog('files collected', { count: files.length });
      // Stage 3: Parsing Files
      await this.updateAnalysisStage(projectId, 'parsing');
      // Parse all files and persist ASTs using ParserService
      let asts: any = {};
      try {
        asts = await this.parserService.parseRepo(dir, detectedLanguage);
        this.dlog('ASTs parsed', { count: Object.keys(asts).length });
      } catch (parseError: any) {
        this.dlog('parseRepo failed, continuing with empty ASTs', { error: parseError?.message });
        // Continue analysis even if parsing fails
      }

      for (const [relPath, astObj] of Object.entries(asts)) {
        try {
          await (this.prisma as any).fileAst.create({
            data: {
              projectId,
              filePath: relPath,
              language: (astObj as any).language,
              astFormat: (astObj as any).format,
              ast: String((astObj as any).ast).slice(0, 500000),
            },
          });
        } catch (astError: any) {
          this.dlog('failed to store AST for file', { relPath, error: astError?.message });
          // Continue with other files
        }
      }
      this.dlog('total files found', { count: files.length });
      // Store file inventory for the project (use repo-relative paths)
      try {
        await (this.prisma as any).projectFile?.deleteMany?.({ where: { projectId } });
        const batch = files.slice(0, 5000).map((p) => {
          const rel = relative(dir!, p).replace(/\\/g, '/');
          const e = extname(p).toLowerCase();
          return { projectId, filePath: rel, ext: e, supported: this.supports(e, detectedLanguage) };
        });
        if (batch.length) await (this.prisma as any).projectFile?.createMany?.({ data: batch, skipDuplicates: true });
      } catch { }

      // Stage 4: Analyzing Code Smells
      await this.updateAnalysisStage(projectId, 'analyzing');
      // Enhanced analysis using new services
      const codeBlocks: Array<{ code: string; filePath: string; startIndex: number; endIndex: number; ast?: any }> = [];
      let created = 0;
      let filesVisited = 0;
      let filesAnalyzed = 0;

      for (const file of files) {
        try {
          const displayPath = relative(dir!, file).replace(/\\/g, '/');
          const code = await readFile(file, 'utf8');
          const ext = extname(file).toLowerCase();
          filesVisited++;
          const supported = this.supports(ext, detectedLanguage);

          if (!supported) {
            this.dlog('skip unsupported', { displayPath, ext, language: detectedLanguage });
            continue;
          }

          this.dlog('analyzing file', { displayPath, ext });

          let astSucceeded = false;
          let ast: any = null;

          // Try Tree-sitter parsing first
          try {
            const parsed = this.parserService.parseWithTreeSitter(code, ext);
            if (parsed) {
              this.dlog('treesitter parsed', { displayPath, langKey: parsed.langKey });
              ast = parsed.tree;

              // Use enhanced analysis service
              const issues = await this.enhancedAnalysisService.analyzeCodeSmells(
                ast,
                code,
                displayPath,
                parsed.langKey,
                projectId
              );

              created += issues.length;
              astSucceeded = true;
              filesAnalyzed++;

              // Add to code blocks for duplicate detection (with size limits)
              if (code.length <= 50000) { // Skip very large files for duplicate detection
                codeBlocks.push({
                  code: code.slice(0, 10000), // Limit code size for duplicate detection
                  filePath: displayPath,
                  startIndex: 0,
                  endIndex: Math.min(code.length, 10000),
                  ast
                });
              }
            }
          } catch (error: any) {
            this.dlog('treesitter parsing failed', { displayPath, error: error?.message || 'Unknown error' });
          }

          // Fallback to JSON AST if available
          const astObj = (asts as any)[displayPath];
          if (!astSucceeded && astObj?.ast && (astObj.format === 'tree-sitter-json' || astObj.format === 'ts-compiler-json')) {
            this.dlog('using JSON AST fallback', { displayPath, format: astObj.format });
            try {
              const jsonAst = JSON.parse(astObj.ast);

              // Basic complexity analysis for fallback
              const funcNodes = this.findFunctionsJson(jsonAst, astObj.format);
              for (const fn of funcNodes) {
                const { start, end } = this.getRangeFromJsonNode(fn, astObj.format);
                const text = code.slice(start, end);
                const complexity = this.calculateComplexityJson(fn, astObj.format, code);
                const fnName = this.extractFunctionNameFromText(text, detectedLanguage);

                if (complexity > this.complexityThreshold) {
                  await (this.prisma as any).issue.create({
                    data: {
                      projectId,
                      filePath: displayPath,
                      functionName: fnName,
                      issueType: 'HighComplexity',
                      severity: complexity > 15 ? 'High' : complexity > 10 ? 'Medium' : 'Low',
                      confidence: 80,
                      description: `Function '${fnName}' has high cyclomatic complexity (${complexity})`,
                      recommendation: 'Consider breaking this function into smaller, more focused functions.',
                      metadata: { complexity },
                      codeBlock: text,
                    },
                  });
                  created++;
                }
              }

              astSucceeded = true;
              filesAnalyzed++;

              codeBlocks.push({
                code,
                filePath: displayPath,
                startIndex: 0,
                endIndex: code.length
              });
            } catch (error: any) {
              this.dlog('JSON AST parsing failed', { displayPath, error: error?.message || 'Unknown error' });
            }
          }

          // Final fallback to text-based analysis
          if (!astSucceeded) {
            this.dlog('falling back to text extraction', { displayPath });
            const blocks = this.extractBlocksFallback(code, detectedLanguage);

            for (const block of blocks) {
              const complexity = this.estimateCyclomaticComplexityFromText(block.text);
              const fnName = this.extractFunctionNameFromText(block.text, detectedLanguage);

              if (complexity > this.complexityThreshold) {
                await (this.prisma as any).issue.create({
                  data: {
                    projectId,
                    filePath: displayPath,
                    functionName: fnName,
                    issueType: 'HighComplexity',
                    severity: complexity > 15 ? 'High' : complexity > 10 ? 'Medium' : 'Low',
                    confidence: 60,
                    description: `Function '${fnName}' has high cyclomatic complexity (${complexity})`,
                    recommendation: 'Consider breaking this function into smaller, more focused functions.',
                    metadata: { complexity },
                    codeBlock: block.text,
                  },
                });
                created++;
              }
            }

            // Add to code blocks for duplicate detection (with size limits)
            if (code.length <= 50000) { // Skip very large files for duplicate detection
              codeBlocks.push({
                code: code.slice(0, 10000), // Limit code size for duplicate detection
                filePath: displayPath,
                startIndex: 0,
                endIndex: Math.min(code.length, 10000)
              });
            }
          }
        } catch (fileError: any) {
          this.dlog('failed to analyze file', { file, error: fileError?.message });
          filesVisited++;
          // Continue with next file
        }
      }

      // Stage 5: Duplicate Detection
      await this.updateAnalysisStage(projectId, 'duplicates');
      // Enhanced duplicate detection with memory optimization
      this.dlog('starting enhanced duplicate detection', { codeBlockCount: codeBlocks.length });

      try {
        // Process in smaller batches to prevent memory overflow
        const batchSize = 50; // Process 50 code blocks at a time
        const allGroups: any[] = [];

        for (let i = 0; i < codeBlocks.length; i += batchSize) {
          const batch = codeBlocks.slice(i, i + batchSize);
          this.dlog(`Processing duplicate detection batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(codeBlocks.length / batchSize)}`);

          try {
            const duplicateGroups = await this.duplicationDetectionService.detectDuplicates(
              batch,
              detectedLanguage
            );
            allGroups.push(...duplicateGroups);

            // Force garbage collection if available
            if (global.gc) {
              global.gc();
            }
          } catch (batchError: any) {
            this.dlog('batch duplicate detection failed', {
              batch: Math.floor(i / batchSize) + 1,
              error: batchError?.message || 'Unknown error'
            });
          }

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        this.dlog('duplicate detection completed', { groupCount: allGroups.length });

        // Store duplicate issues
        for (const group of allGroups) {
          try {
            for (const block of group.blocks) {
              await (this.prisma as any).issue.create({
                data: {
                  projectId,
                  filePath: block.filePath,
                  functionName: null,
                  issueType: 'DuplicateCode',
                  severity: group.severity,
                  confidence: Math.round(group.similarity * 100),
                  description: `${group.type} duplicate code found (${group.blocks.length} instances across ${group.affectedFiles.length} files)`,
                  recommendation: 'Extract common code into a shared function or module to reduce duplication.',
                  duplicateGroupId: group.id,
                  metadata: {
                    duplicateType: group.type,
                    similarity: group.similarity,
                    totalInstances: group.blocks.length,
                    affectedFiles: group.affectedFiles,
                    totalLines: group.totalLines
                  },
                  codeBlock: block.originalCode.slice(0, 2000), // Limit size
                },
              });
              created++;
            }
          } catch (storeError: any) {
            this.dlog('failed to store duplicate group', {
              groupId: group.id,
              error: storeError?.message || 'Unknown error'
            });
          }
        }
      } catch (error: any) {
        this.dlog('duplicate detection failed', { error: error?.message || 'Unknown error' });
      }
      this.dlog('analysis complete', { totalIssues: created, filesVisited, filesAnalyzed });
      // Mark project completed
      await (this.prisma as any).project.update({ where: { id: projectId }, data: { status: 'Completed', analysisStage: 'completed' } });

      this.dlog('Analysis completed successfully');
    } catch (e) {
      // Mark project failed
      try {
        await (this.prisma as any).project.update({ where: { id: projectId }, data: { status: 'Failed' } });
      } catch { }
      throw e;
    } finally {
      // Cleanup temp dir best-effort
      if (dir) {
        try {
          const { rm } = await import('fs/promises');
          await (rm as any)(dir, { recursive: true, force: true });
        } catch { }
      }
    }
  }

  // Quick analysis for CI: analyze changed files without persisting to DB
  async quickAnalyzeRepo(gitUrl: string, language?: string, filesFilter?: string[]) {
    this.dlog('[quick] start', { gitUrl, language, filesFilter });
    const dir = await mkdtemp(join(tmpdir(), 'codestruct-ci-'));
    const git = simpleGit();
    await git.clone(gitUrl, dir);

    // Auto-detect language if not provided
    const detectedLanguage = language || await this.detectLanguage(dir);
    this.dlog('[quick] using language', { detectedLanguage });

    const files = await this.collectFiles(dir);
    this.dlog('[quick] files collected', { count: files.length });
    const targetFiles = filesFilter && filesFilter.length
      ? files.filter((f) => filesFilter.some((rel) => f.endsWith(rel)))
      : files;

    const issues: any[] = [];
    for (const file of targetFiles) {
      const code = await readFile(file, 'utf8');
      const ext = extname(file).toLowerCase();
      if (!this.supports(ext, detectedLanguage)) continue;
      let blocks: { start: number; end: number; text: string; node?: any }[] = [];
      try {
        const parsed = this.parserService.parseWithTreeSitter(code, ext);
        if (!parsed) throw new Error('Tree-sitter unavailable');
        const tree = parsed.tree;
        const fnTypes = ['function_declaration', 'method_definition', 'arrow_function', 'function', 'function_definition'];
        const nodes = this.queryNodes(tree, fnTypes);
        blocks = nodes.map((n: any) => ({ start: n.startIndex, end: n.endIndex, text: code.slice(n.startIndex, n.endIndex), node: n }));
        this.dlog('[quick] AST ok', { file });
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(`[analysis:quick] AST parsing failed for file ${file}:`, e);
        blocks = this.extractBlocksFallback(code, detectedLanguage);
        this.dlog('[quick] fallback blocks', { file, count: blocks.length });
      }

      for (const b of blocks) {
        const complexity = this.estimateCyclomaticComplexityFromText(b.text);
        if (complexity > this.complexityThreshold) {
          issues.push({ filePath: file, issueType: 'HighComplexity', metadata: { complexity }, codeBlock: b.text });
        }
      }

      const map = new Map<string, { start: number; end: number; text: string }[]>();
      for (const b of blocks) {
        if (!b.node) continue;
        const normalized = this.normalizeAndHashNode(b.node);
        const hash = this.simpleHash(normalized);
        const arr = map.get(hash) || [];
        arr.push(b);
        map.set(hash, arr);
      }
      for (const [_, list] of map.entries()) {
        if (list.length > 1) {
          for (const item of list) {
            issues.push({ filePath: file, issueType: 'DuplicateCode', metadata: { duplicates: list.length }, codeBlock: item.text });
          }
        }
      }
    }

    this.dlog('[quick] done', { issues: issues.length });
    return { projectName: this.deriveProjectName(gitUrl), issues };
  }

  private supports(ext: string, language: string) {
    const ts = ['.ts', '.tsx', '.js', '.jsx'];
    const py = ['.py'];
    const java = ['.java'];
    const l = (language || '').toLowerCase();

    const wantsTs = ['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript', 'node'].some((k) => l.includes(k));
    const wantsPy = ['py', 'python'].some((k) => l.includes(k));
    const wantsJava = ['java'].some((k) => l.includes(k));

    if (wantsTs) return ts.includes(ext);
    if (wantsPy) return py.includes(ext);
    if (wantsJava) return java.includes(ext);

    // If language not specified clearly, try to support based on extension
    if (ts.includes(ext) || py.includes(ext) || java.includes(ext)) return true;

    // Default fallback
    return ts.includes(ext);
  }

  private async collectFiles(root: string) {
    const walk = async (dir: string, acc: string[] = []) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          const name = e.name.toLowerCase();
          if (name === '.git' || name === 'node_modules' || name === 'dist' || name === 'build' || name === '.next') {
            continue;
          }
          await walk(p, acc);
        }
        else acc.push(p);
      }
      return acc;
    };
    return walk(root);
  }

  // Very rough cyclomatic complexity estimation by counting branching nodes
  private async detectHighComplexityFunctions(
    tree: any,
    code: string,
    projectId: number,
    filePath: string
  ) {
    const functionNodes = this.queryNodes(tree, [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'function',
    ]);

    for (const node of functionNodes) {
      const signature = code.slice(node.startIndex, node.endIndex);
      const complexity = this.estimateCyclomaticComplexity(node, code);
      if (complexity > this.complexityThreshold) {
        await (this.prisma as any).issue.create({
          data: {
            projectId,
            filePath,
            functionName: this.extractFunctionName(node, code),
            issueType: 'HighComplexity',
            metadata: { complexity },
            codeBlock: signature,
          },
        });
      }
    }
  }

  private estimateCyclomaticComplexity(node: any, code: string) {
    const keywords = ['if', 'for', 'while', 'case', 'catch', '&&', '||', '?'];
    const text = code.slice(node.startIndex, node.endIndex);
    let score = 1;
    for (const kw of keywords) {
      const matches = text.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (matches) score += matches.length;
    }
    return score;
  }

  private estimateCyclomaticComplexityFromText(text: string) {
    const keywords = ['if', 'for', 'while', 'case', 'catch', '&&', '||', '?', 'elif'];
    let score = 1;
    for (const kw of keywords) {
      const matches = text.match(new RegExp(`\\b${kw}\\b`, 'g'));
      if (matches) score += matches.length;
    }
    return score;
  }

  private estimateCyclomaticComplexityAst(node: any, code: string, language: string) {
    // Traverse AST and count decision nodes per spec
    const decisionTypesTs = new Set([
      'if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_clause', 'catch_clause', 'conditional_expression',
      'binary_expression', 'logical_expression', 'do_statement', 'else_clause', 'try_statement', 'throw_statement', 'break_statement', 'continue_statement', 'return_statement',
    ]);
    const decisionTypesPy = new Set([
      'if_statement', 'for_statement', 'while_statement', 'except_clause', 'conditional_expression',
      'elif_clause', 'else_clause', 'try_statement', 'break_statement', 'continue_statement', 'return_statement',
    ]);
    const logicalOps = ['&&', '||'];
    const isPy = language.toLowerCase().includes('py');
    const decisionTypes = isPy ? decisionTypesPy : decisionTypesTs;
    let score = 1;
    const walk = (n: any) => {
      if (!n) return;
      if (decisionTypes.has(n.type)) score++;
      // Count logical operators inside this node text
      const text = code.slice(n.startIndex, n.endIndex);
      for (const op of logicalOps) {
        const matches = text.match(new RegExp(`\${op}`, 'g'));
        if (matches) score += matches.length;
      }
      for (let i = 0; i < n.childCount; i++) walk(n.child(i));
    };
    walk(node);
    return score;
  }

  // AST-based normalization for duplicate detection (less strict)
  private normalizeNode(node: any): string {
    if (!node) return '';
    // Ignore only comments and punctuation
    const ignoreTypes = new Set(['comment', ';', ',']);
    if (ignoreTypes.has(node.type)) return '';
    // Replace identifiers generically
    const identifierTypes = new Set(['identifier', 'property_identifier']);
    if (identifierTypes.has(node.type)) return '(ID)';
    // Replace string/number literals generically
    const stringLike = new Set(['string', 'string_fragment', 'template_string', 'template_substitution', 'template_literal']);
    if (stringLike.has(node.type)) return '(STR)';
    const numberLike = new Set(['number', 'integer', 'float', 'decimal_integer', 'float_number', 'numeric_literal']);
    if (numberLike.has(node.type)) return '(NUM)';
    let result = `(${node.type}`;
    if (Array.isArray(node.namedChildren)) {
      for (const child of node.namedChildren) {
        result += this.normalizeNode(child);
      }
    } else {
      for (let i = 0; i < (node.childCount || 0); i++) {
        const c = node.child(i);
        if (c) result += this.normalizeNode(c);
      }
    }
    result += ')';
    return result;
  }

  private extractFunctionName(node: any, code: string) {
    // Simple heuristic for function name
    const text = code.slice(node.startIndex, node.endIndex);
    const m = text.match(/function\s+(\w+)/) || text.match(/(\w+)\s*\(/);
    return m ? m[1] : null;
  }

  // Deprecated in favor of generic block flow (kept for reference)
  private async detectDuplicateBlocks() { /* no-op */ }

  private queryNodes(tree: any, types: string[]) {
    const nodes: any[] = [];
    const walk = (n: any) => {
      if (types.includes(n.type)) nodes.push(n);
      for (let i = 0; i < n.childCount; i++) walk(n.child(i)!);
    };
    walk(tree.rootNode);
    return nodes;
  }

  // Build a structural string from an AST node, replacing identifiers with a placeholder
  private normalizeAndHashNode(node: any): string {
    if (!node) return '';
    // Ignore certain trivial token types
    const ignoreTypes = new Set(['comment', ';', ',']);
    if (ignoreTypes.has(node.type)) return '';
    // Replace identifiers generically
    const identifierTypes = new Set(['identifier', 'property_identifier']);
    if (identifierTypes.has(node.type)) {
      return '(IDENTIFIER)';
    }
    // Recursively include only named children to skip punctuation/whitespace
    let result = `(${node.type}`;
    if (Array.isArray(node.namedChildren)) {
      for (const child of node.namedChildren) {
        result += this.normalizeAndHashNode(child);
      }
    } else {
      // Fallback iterate children if namedChildren missing
      for (let i = 0; i < (node.childCount || 0); i++) {
        const c = node.child(i);
        if (c) result += this.normalizeAndHashNode(c);
      }
    }
    result += ')';
    return result;
  }

  private simpleHash(input: string): string {
    // djb2 variant
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      h = (h * 33) ^ input.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  // Fallback structural normalization using TypeScript compiler API (if available)
  private normalizeAndHashTsSnippet(code: string, ext: string): string | null {
    if (!this.tsApi) return null;
    try {
      const ts = this.tsApi;
      const scriptKind = ext === '.tsx' ? ts.ScriptKind.TSX : ext === '.jsx' ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
      const sf = ts.createSourceFile('tmp' + ext, code, ts.ScriptTarget.ES2020, true, scriptKind);
      const serialize = (n: any): any => {
        const nodeObj: any = {
          type: ts.SyntaxKind[n.kind],
          pos: n.pos,
          end: n.end,
          children: [] as any[],
        };
        ts.forEachChild(n, (c: any) => {
          nodeObj.children.push(serialize(c));
        });
        return nodeObj;
      };
      return JSON.stringify(serialize(sf), null, 2);
    } catch {
      return null;
    }
  }

  // Deprecated: kept temporarily for reference; no longer used
  private normalizeAstLike(text: string) {
    return text
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, 'ID')
      .replace(/\d+/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractFunctionNameFromText(text: string, language: string) {
    const lang = language.toLowerCase();
    if (lang.includes('py')) {
      const m = text.match(/def\s+(\w+)\s*\(/);
      return m ? m[1] : null;
    }
    const m = text.match(/function\s+(\w+)/) || text.match(/(\w+)\s*\(/);
    return m ? m[1] : null;
  }

  private extractBlocksFallback(code: string, language: string) {
    const lang = language.toLowerCase();
    if (lang.includes('py')) return this.extractBlocksFallbackPy(code);
    // default to JS/TS
    return this.extractBlocksFallbackJs(code);
  }

  private extractBlocksFallbackJs(code: string) {
    const blocks: { start: number; end: number; text: string }[] = [];
    const findMatchingBrace = (startIdx: number) => {
      let depth = 0;
      for (let i = startIdx; i < code.length; i++) {
        const ch = code[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    };
    // function declarations
    const funcRegex = /function\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{/g;
    for (let m; (m = funcRegex.exec(code));) {
      const braceIdx = m.index + m[0].lastIndexOf('{');
      const end = findMatchingBrace(braceIdx);
      if (end > braceIdx) blocks.push({ start: m.index, end: end + 1, text: code.slice(m.index, end + 1) });
    }
    // class methods and constructors
    const reserved = new Set(['if', 'for', 'while', 'switch', 'catch', 'try', 'else', 'do', 'function']);
    const methodRegex = /(?:^|\n)\s*(?:public|private|protected|static|async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/g;
    for (let m; (m = methodRegex.exec(code));) {
      const name = m[1];
      if (reserved.has(name)) continue;
      const braceIdx = m.index + m[0].lastIndexOf('{');
      const end = findMatchingBrace(braceIdx);
      if (end > braceIdx) {
        const start = m.index;
        blocks.push({ start, end: end + 1, text: code.slice(start, end + 1) });
      }
    }
    // arrow functions with block body: => { ... }
    const arrowRegex = /=>\s*\{/g;
    for (let m; (m = arrowRegex.exec(code));) {
      const braceIdx = m.index + m[0].indexOf('{');
      const end = findMatchingBrace(braceIdx);
      if (end > braceIdx) {
        // backtrack a bit to include variable name if present
        const start = Math.max(0, code.lastIndexOf('\n', m.index - 80));
        blocks.push({ start, end: end + 1, text: code.slice(start, end + 1) });
      }
    }
    return blocks;
  }

  private extractBlocksFallbackPy(code: string) {
    const blocks: { start: number; end: number; text: string }[] = [];
    const lines = code.split(/\r?\n/);
    let offset = 0; // track index offset
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const defMatch = line.match(/^([ \t]*)def\s+\w+\s*\(.*\)\s*:/);
      const lineStartIdx = offset;
      const lineEndIdx = offset + line.length;
      if (defMatch) {
        const indent = defMatch[1] || '';
        let j = i + 1;
        let endIdx = lineEndIdx;
        for (; j < lines.length; j++) {
          const l = lines[j];
          const isBlank = /^\s*$/.test(l);
          const ind = (l.match(/^([ \t]*)/) || ['', ''])[1];
          if (!isBlank && ind.length <= indent.length) break;
          endIdx += 1 + l.length; // +1 for newline
        }
        blocks.push({ start: lineStartIdx, end: endIdx, text: code.slice(lineStartIdx, endIdx) });
        i = j - 1;
      }
      offset = lineEndIdx + 1;
    }
    return blocks;
  }

  // Task 1: High Complexity with Tree-sitter
  private async detectHighComplexity(ast: any, language: string, projectId: number, filePath: string) {
    if (!ast?.rootNode) return;
    const lang = language.toLowerCase();
    // Prefer query-based function discovery when possible
    let nodes: any[] = [];
    const fnQuery = `
      [
        (function_declaration name: (identifier) @fn)
        (method_definition name: (property_identifier) @fn)
        (arrow_function) @fn
        (function_definition name: (identifier) @fn)
      ]
    `;
    const captures = this.parserService.runQueryOnTree(ast.rootNode, lang.includes('py') ? 'python' : (lang.includes('tsx') ? 'tsx' : 'typescript'), fnQuery);
    if (captures && captures.length) {
      // Deduce nodes from captures (capture names may repeat; use node uniqueness)
      const seen = new Set<any>();
      for (const c of captures) {
        if (!seen.has(c.node)) { seen.add(c.node); nodes.push(c.node); }
      }
    } else {
      const fnTypes = ['function_declaration', 'method_definition', 'arrow_function', 'function_definition'];
      nodes = this.queryNodes(ast, fnTypes);
    }
    for (const node of nodes) {
      const src = this.currentSourceText || '';
      const code = src.slice(node.startIndex ?? 0, node.endIndex ?? 0);
      const complexity = this.estimateCyclomaticComplexityAstTreeSitter(node, lang, src);
      const fnName = this.extractFunctionNameFromText(code, language);
      // Deep debug log per function
      console.log(`[DEBUG] Complexity Check => Function: "${fnName}", Score: ${complexity}, Threshold: ${this.complexityThreshold}`);
      if (complexity > this.complexityThreshold) {
        console.log(`[SUCCESS] High complexity issue found for "${fnName}"`);
        await (this.prisma as any).issue.create({
          data: {
            projectId,
            filePath,
            functionName: fnName,
            issueType: 'HighComplexity',
            metadata: { complexity },
            codeBlock: code,
          },
        });
      }
    }
  }

  // Helper: complexity over Tree-sitter nodes
  private estimateCyclomaticComplexityAstTreeSitter(node: any, lang: string, code: string): number {
    let score = 1;
    const tsDecisions = new Set(['if_statement', 'for_statement', 'while_statement', 'switch_statement', 'case_clause', 'binary_expression', 'conditional_expression']);
    const pyDecisions = new Set(['if_statement', 'for_statement', 'while_statement', 'elif_clause', 'conditional_expression']);
    const walk = (n: any) => {
      if (!n) return;
      const t = n.type;
      if (lang.includes('python')) {
        if (pyDecisions.has(t)) score++;
      } else {
        if (t === 'binary_expression') {
          const txt = code.slice(n.startIndex ?? 0, n.endIndex ?? 0);
          if (txt.includes('&&') || txt.includes('||')) score++;
        } else if (tsDecisions.has(t)) score++;
      }
      for (let i = 0; i < (n.namedChildCount ?? 0); i++) walk(n.namedChild(i));
      if (!(n.namedChildCount > 0) && n.childCount) {
        for (let i = 0; i < n.childCount; i++) walk(n.child(i));
      }
    };
    walk(node);
    return score;
  }

  // Task 2: Duplicate blocks with Tree-sitter
  private findCodeBlocksForDuplication(ast: any, fileContent: string, filePath: string, duplicateMap: Map<string, any[]>) {
    if (!ast?.rootNode) return;
    const blockTypes = ['statement_block', 'block'];
    const blocks = this.queryNodes(ast, blockTypes);
    for (const b of blocks) {
      const norm = this.normalizeNode(b);
      const hash = this.simpleHash(norm);
      const text = fileContent.slice(b.startIndex, b.endIndex);
      // Deep debug log for duplicate hashing/normalization
      console.log(`\n  [DEBUG] Duplicate Check =>\n    - HASH: ${hash}\n    - NORMALIZED: ${norm.substring(0, 100)}... \n    - ORIGINAL CODE: ${text.substring(0, 80)}...\n`);
      const arr = duplicateMap.get(hash) || [];
      arr.push({ file: filePath, text, start: b.startIndex, end: b.endIndex });
      duplicateMap.set(hash, arr);
      this.dlog('DupBlock', { filePath, hash, preview: text.slice(0, 60).replace(/\s+/g, ' ') + (text.length > 60 ? '…' : '') });
    }
  }

  // Task 3: Magic numbers with Tree-sitter
  private async detectMagicNumbers(ast: any, codeBlock: string, projectId: number, filePath: string) {
    if (!ast?.rootNode) return;
    const ignoreList = new Set([0, 1, -1]);
    const numTypes = new Set(['number', 'integer', 'float', 'decimal_integer', 'float_number', 'numeric_literal']);
    const found: Map<number, number> = new Map();
    const walk = (n: any) => {
      if (!n) return;
      if (numTypes.has(n.type)) {
        const v = Number(codeBlock.slice(n.startIndex, n.endIndex));
        // Deep debug logs for magic numbers
        if (!Number.isNaN(v)) {
          if (ignoreList.has(v)) {
            console.log(`[DEBUG] Magic Number => Found ${v}, but it is on the ignore list.`);
          } else {
            console.log(`[DEBUG] Magic Number => Found potential magic number: ${v}`);
          }
        }
        if (!Number.isNaN(v) && !ignoreList.has(v)) {
          found.set(v, (found.get(v) || 0) + 1);
        }
      }
      for (let i = 0; i < (n.namedChildCount ?? 0); i++) walk(n.namedChild(i));
      if (!(n.namedChildCount > 0) && n.childCount) {
        for (let i = 0; i < n.childCount; i++) walk(n.child(i));
      }
    };
    walk(ast.rootNode);
    for (const [value, count] of found) {
      this.dlog('MagicNumber', { filePath, value, count });
      await (this.prisma as any).issue.create({
        data: {
          projectId,
          filePath,
          functionName: null,
          issueType: 'MagicNumber',
          metadata: { value, count },
          codeBlock: codeBlock.slice(0, Math.min(2000, codeBlock.length)),
        },
      });
    }
  }

  // After-scan: process duplicates map
  private async processDuplicates(duplicateMap: Map<string, any[]>, projectId: number, language: string) {
    for (const [hash, list] of duplicateMap.entries()) {
      if (list.length > 1) {
        this.dlog('Duplicate group', { hash, count: list.length, files: Array.from(new Set(list.map(i => i.file))) });
        for (const item of list) {
          await (this.prisma as any).issue.create({
            data: {
              projectId,
              filePath: item.file,
              functionName: this.extractFunctionNameFromText(item.text, language),
              issueType: 'DuplicateCode',
              metadata: { duplicates: list.length },
              codeBlock: item.text,
            },
          });
        }
      }
    }
  }

  // Utility to read TS node code (using indices)
  // removed unused readNodeCode helper

  // JSON AST helpers
  private findFunctionsJson(root: any, format: string): any[] {
    const out: any[] = [];
    const isFn = (t: string) => {
      const tsKinds = new Set([
        'FunctionDeclaration', 'MethodDeclaration', 'ArrowFunction', 'FunctionExpression',
      ]);
      const tsxExtra = new Set(['GetAccessor', 'SetAccessor']);
      if (format.startsWith('ts-compiler')) return tsKinds.has(t) || tsxExtra.has(t);
      return t === 'function_declaration' || t === 'method_definition' || t === 'arrow_function' || t === 'function' || t === 'function_definition';
    };
    const walk = (n: any) => {
      if (!n) return;
      if (n.type && isFn(n.type)) out.push(n);
      if (Array.isArray(n.children)) {
        for (const c of n.children) walk(c);
      }
    };
    walk(root);
    return out;
  }

  private calculateComplexityJson(node: any, format: string, code: string): number {
    let score = 1;
    const tsDecisions = new Set([
      'IfStatement', 'ForStatement', 'WhileStatement', 'DoStatement', 'CaseClause', 'DefaultClause', 'CatchClause', 'ConditionalExpression', 'BinaryExpression',
    ]);
    const tsLogicalKinds = new Set(['BinaryExpression']);
    const tsOps = new Set(['&&', '||']);
    const walk = (n: any) => {
      if (!n) return;
      if (format.startsWith('ts-compiler-json')) {
        if (tsDecisions.has(n.type)) score++;
        if (n.type === 'BinaryExpression') {
          const txt = code.slice(n.pos ?? 0, n.end ?? 0);
          if (txt.includes('&&') || txt.includes('||')) score++;
        }
      } else {
        const tsLikeDec = new Set([
          'if_statement', 'for_statement', 'while_statement', 'do_statement', 'case_clause', 'default_clause', 'catch_clause', 'conditional_expression', 'binary_expression', 'logical_expression',
        ]);
        if (tsLikeDec.has(n.type)) score++;
      }
      if (Array.isArray(n.children)) for (const c of n.children) walk(c);
    };
    walk(node);
    return score;
  }

  private async detectMagicNumbersJson(root: any, code: string, projectId: number, filePath: string, format: string) {
    const ignore = new Set([0, 1, -1]);
    const nums = new Map<number, number>();
    const isNum = (t: string) => {
      if (format.startsWith('ts-compiler')) return t === 'NumericLiteral' || t === 'FirstLiteralToken';
      return t === 'number' || t === 'integer' || t === 'float' || t === 'float_number' || t === 'decimal_integer';
    };
    const range = (n: any) => format.startsWith('ts-compiler') ? { s: n.pos ?? 0, e: n.end ?? 0 } : { s: n.startIndex ?? 0, e: n.endIndex ?? 0 };
    const walk = (n: any) => {
      if (!n) return;
      if (n.type && isNum(n.type)) {
        const { s, e } = range(n);
        const v = Number(code.slice(s, e).replace(/_/g, ''));
        if (!Number.isNaN(v)) {
          if (ignore.has(v)) {
            console.log(`[DEBUG] Magic Number => Found ${v}, but it is on the ignore list.`);
          } else {
            console.log(`[DEBUG] Magic Number => Found potential magic number: ${v}`);
            nums.set(v, (nums.get(v) || 0) + 1);
          }
        }
      }
      if (Array.isArray(n.children)) for (const c of n.children) walk(c);
    };
    walk(root);
    for (const [value, count] of nums) {
      await (this.prisma as any).issue.create({
        data: {
          projectId,
          filePath,
          functionName: null,
          issueType: 'MagicNumber',
          metadata: { value, count },
          codeBlock: code.slice(0, Math.min(code.length, 2000)),
        },
      });
    }
  }

  private findBlocksForDuplicationJson(root: any, code: string, filePath: string, duplicateMap: Map<string, any[]>, format: string) {
    const isBlock = (t: string) => format.startsWith('ts-compiler') ? t === 'Block' : (t === 'block' || t === 'statement_block');
    const range = (n: any) => format.startsWith('ts-compiler') ? { s: n.pos ?? 0, e: n.end ?? 0 } : { s: n.startIndex ?? 0, e: n.endIndex ?? 0 };
    const walk = (n: any) => {
      if (!n) return;
      if (n.type && isBlock(n.type)) {
        const { s, e } = range(n);
        const text = code.slice(s, e);
        const sig = this.normalizeJsonNode(n);
        const hash = this.simpleHash(sig);
        const arr = duplicateMap.get(hash) || [];
        arr.push({ file: filePath, text, start: s, end: e });
        duplicateMap.set(hash, arr);
      }
      if (Array.isArray(n.children)) for (const c of n.children) walk(c);
    };
    walk(root);
  }

  private normalizeJsonNode(node: any): string {
    if (!node) return '';
    const idNames = new Set(['Identifier', 'identifier', 'property_identifier']);
    if (idNames.has(node.type)) return '(ID)';
    const stringLike = new Set(['StringLiteral', 'TemplateExpression', 'NoSubstitutionTemplateLiteral', 'String', 'string', 'string_fragment', 'template_string']);
    if (stringLike.has(node.type)) return '(STR)';
    const numberLike = new Set(['NumericLiteral', 'FirstLiteralToken', 'Number', 'number', 'integer', 'float', 'decimal_integer']);
    if (numberLike.has(node.type)) return '(NUM)';
    let out = `(${node.type}`;
    if (Array.isArray(node.children)) for (const c of node.children) out += this.normalizeJsonNode(c);
    out += ')';
    return out;
  }

  private getRangeFromJsonNode(node: any, format: string): { start: number; end: number } {
    if (format.startsWith('ts-compiler-json')) {
      return { start: typeof node.pos === 'number' ? node.pos : 0, end: typeof node.end === 'number' ? node.end : 0 };
    }
    return { start: typeof node.startIndex === 'number' ? node.startIndex : 0, end: typeof node.endIndex === 'number' ? node.endIndex : 0 };
  }

  // Deprecated: old hashing helper; replaced by simpleHash
  private async hash(input: string) {
    return this.simpleHash(input);
  }

  // Magic number detection using AST queries if available (more permissive)
  private findMagicNumbers(text: string, language: string, astNode?: any): { value: number; count: number }[] {
    const ignore = new Set([-1]); // only ignore -1, flag 0/1 for visibility
    const counts = new Map<number, number>();
    if (astNode) {
      const walk = (n: any) => {
        if (!n) return;
        if (n.type === 'number') {
          const v = Number(text.slice(n.startIndex, n.endIndex));
          if (!Number.isNaN(v) && !ignore.has(v)) {
            counts.set(v, (counts.get(v) || 0) + 1);
          }
        }
        for (let i = 0; i < n.childCount; i++) walk(n.child(i));
      };
      walk(astNode);
    } else {
      const nums = text.match(/(?<![A-Za-z_])[-+]?\b\d+(?:_\d+)*(?:\.\d+)?\b/g) || [];
      for (const n of nums) {
        const v = Number(n.replace(/_/g, ''));
        if (Number.isNaN(v)) continue;
        if (ignore.has(v)) continue;
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
    // Do not filter loop headers; flag all
    const filtered: { value: number; count: number }[] = [];
    for (const [value, count] of counts.entries()) {
      filtered.push({ value, count });
    }
    return filtered;
  }

  /**
   * Update the analysis stage for a project to show progress
   */
  private async updateAnalysisStage(projectId: number, stage: string) {
    try {
      await (this.prisma as any).project.update({
        where: { id: projectId },
        data: { analysisStage: stage }
      });
      this.dlog(`[Stage] Updated to: ${stage}`, { projectId });
    } catch (error) {
      this.dlog(`[Stage] Failed to update stage:`, error);
    }
  }
}
