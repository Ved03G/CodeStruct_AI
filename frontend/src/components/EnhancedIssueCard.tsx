import React from 'react';
import { EnhancedIssue } from '../types/analysis';

interface Props {
    issue: EnhancedIssue;
}

const severityColors = {
    Low: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Critical: 'bg-red-100 text-red-800 border-red-200'
};

const severityColorsDark = {
    Low: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    Medium: 'dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
    High: 'dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    Critical: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
};

const issueTypeColors = {
    LongMethod: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    GodClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    DeepNesting: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    LongParameterList: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    HighComplexity: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    CognitiveComplexity: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    DuplicateCode: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    MagicNumber: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    DeadCode: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    FeatureEnvy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
};

const EnhancedIssueCard: React.FC<Props> = ({ issue }) => {
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'text-green-600 dark:text-green-400';
        if (confidence >= 75) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const formatMetrics = (metadata: Record<string, any>) => {
        if (!metadata) return [];

        const metrics = [];
        if (metadata.complexity !== undefined) {
            metrics.push(`Complexity: ${metadata.complexity}`);
        }
        if (metadata.cyclomaticComplexity !== undefined) {
            metrics.push(`Cyclomatic: ${metadata.cyclomaticComplexity}`);
        }
        if (metadata.cognitiveComplexity !== undefined) {
            metrics.push(`Cognitive: ${metadata.cognitiveComplexity}`);
        }
        if (metadata.codeLines !== undefined) {
            metrics.push(`Lines: ${metadata.codeLines}`);
        }
        if (metadata.parameterCount !== undefined) {
            metrics.push(`Parameters: ${metadata.parameterCount}`);
        }
        if (metadata.maxNesting !== undefined) {
            metrics.push(`Nesting: ${metadata.maxNesting}`);
        }
        if (metadata.duplicates !== undefined) {
            metrics.push(`Duplicates: ${metadata.duplicates}`);
        }
        if (metadata.similarity !== undefined) {
            metrics.push(`Similarity: ${Math.round(metadata.similarity * 100)}%`);
        }

        return metrics;
    };

    const metrics = formatMetrics(issue.metadata || {});

    return (
        <div className="border rounded-lg p-4 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${issueTypeColors[issue.issueType]}`}>
                        {issue.issueType}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${severityColors[issue.severity]} ${severityColorsDark[issue.severity]}`}>
                        {issue.severity}
                    </span>
                    <span className={`text-xs font-medium ${getConfidenceColor(issue.confidence)}`}>
                        {issue.confidence}% confidence
                    </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {issue.filePath}
                    {issue.lineStart && issue.lineEnd && (
                        <span className="ml-1">:{issue.lineStart}-{issue.lineEnd}</span>
                    )}
                </div>
            </div>

            {/* Function/Class Info */}
            {(issue.functionName || issue.className) && (
                <div className="flex items-center gap-2 text-sm">
                    {issue.className && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Class: {issue.className}
                        </span>
                    )}
                    {issue.functionName && (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Function: {issue.functionName}
                        </span>
                    )}
                </div>
            )}

            {/* Description */}
            {issue.description && (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                    {issue.description}
                </div>
            )}

            {/* Metrics */}
            {metrics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {metrics.map((metric, index) => (
                        <span
                            key={index}
                            className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                        >
                            {metric}
                        </span>
                    ))}
                </div>
            )}

            {/* Recommendation */}
            {issue.recommendation && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                    <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                        💡 Recommendation
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                        {issue.recommendation}
                    </div>
                </div>
            )}

            {/* Code Block Preview */}
            <div className="border rounded bg-slate-50 dark:bg-slate-900/60 dark:border-slate-700">
                <div className="px-3 py-2 border-b dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Code Block
                    </span>
                    <button
                        className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded transition-colors"
                        onClick={() => navigator.clipboard.writeText(issue.codeBlock)}
                        title="Copy code to clipboard"
                    >
                        Copy
                    </button>
                </div>
                <pre className="text-xs p-3 overflow-auto max-h-32 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {issue.codeBlock}
                </pre>
            </div>
        </div>
    );
};

export default EnhancedIssueCard;