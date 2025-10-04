// Enhanced types for the new analysis system
export interface EnhancedIssue {
    id: number;
    filePath: string;
    functionName?: string;
    className?: string;
    issueType: 'LongMethod' | 'GodClass' | 'DeepNesting' | 'LongParameterList' | 'HighComplexity' | 'CognitiveComplexity' | 'DuplicateCode' | 'MagicNumber' | 'DeadCode' | 'FeatureEnvy';
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number; // 0-100
    description?: string;
    recommendation?: string;
    lineStart?: number;
    lineEnd?: number;
    metadata?: Record<string, any>;
    codeBlock: string;
    duplicateGroupId?: string;
    createdAt: string;
}

export interface ProjectData {
    id: number;
    name: string;
    gitUrl: string;
    language: string;
    status: 'Analyzing' | 'Completed' | 'Failed';
    analysisStage?: 'cloning' | 'detecting' | 'parsing' | 'analyzing' | 'duplicates' | 'refactoring' | 'pr' | 'completed';
    issues: EnhancedIssue[];
    files: string[];
    astFiles: string[];
    createdAt: string;
}

export interface DuplicateGroup {
    id: string;
    issues: EnhancedIssue[];
    similarity: number;
    type: 'Exact' | 'Structural' | 'Semantic';
    affectedFiles: string[];
    totalLines: number;
}

export interface ProjectAnalytics {
    totalIssues: number;
    issuesBySeverity: Record<string, number>;
    issuesByType: Record<string, number>;
    codeQualityScore: number;
    duplicateGroups: DuplicateGroup[];
    complexityDistribution: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
}