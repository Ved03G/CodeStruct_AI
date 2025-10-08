import React from 'react';
import { Link } from 'react-router-dom';

interface ProjectSummary {
    id: number;
    name: string;
    gitUrl: string;
    language: string;
    status: 'Analyzing' | 'Completed' | 'Failed';
    issues: Array<{
        issueType: string;
        severity: string;
        confidence: number;
    }>;
    createdAt: string;
}

interface Props {
    project: ProjectSummary;
}

const EnhancedProjectCard: React.FC<Props> = ({ project }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Analyzing':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'Failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300';
        }
    };

    const issuesSummary = React.useMemo(() => {
        const summary = {
            total: project.issues.length,
            critical: project.issues.filter(i => i.severity === 'Critical').length,
            high: project.issues.filter(i => i.severity === 'High').length,
            medium: project.issues.filter(i => i.severity === 'Medium').length,
            low: project.issues.filter(i => i.severity === 'Low').length,
        };

        // Calculate quality score
        const criticalWeight = 10;
        const highWeight = 5;
        const mediumWeight = 2;
        const lowWeight = 1;

        const severityScore =
            summary.critical * criticalWeight +
            summary.high * highWeight +
            summary.medium * mediumWeight +
            summary.low * lowWeight;

        const maxPossibleScore = summary.total * criticalWeight;
        const qualityScore = maxPossibleScore > 0
            ? Math.max(0, Math.round(100 - (severityScore / maxPossibleScore) * 100))
            : 100;

        return { ...summary, qualityScore };
    }, [project.issues]);

    const getQualityScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600 dark:text-green-400';
        if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
        if (score >= 50) return 'text-orange-600 dark:text-orange-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <Link
            to={`/project/${project.id}`}
            className="block bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6 hover:shadow-lg dark:hover:shadow-neutral-900/20 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {project.name}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                        {project.gitUrl}
                    </p>
                </div>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                </span>
            </div>

            {/* Language and Date */}
            <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    {project.language}
                </span>
                <span>
                    {new Date(project.createdAt).toLocaleDateString()}
                </span>
            </div>

            {/* Quality Score and Issues Summary */}
            {project.status === 'Completed' && (
                <div className="space-y-3">
                    {/* Quality Score */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Code Quality</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${getQualityScoreColor(issuesSummary.qualityScore)}`}>
                                {issuesSummary.qualityScore}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">/100</span>
                        </div>
                    </div>

                    {/* Issues Breakdown */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                {issuesSummary.critical}
                            </div>
                            <div className="text-xs text-red-500 dark:text-red-400">Critical</div>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                            <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                {issuesSummary.high}
                            </div>
                            <div className="text-xs text-orange-500 dark:text-orange-400">High</div>
                        </div>
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                            <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                                {issuesSummary.medium}
                            </div>
                            <div className="text-xs text-yellow-500 dark:text-yellow-400">Medium</div>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {issuesSummary.low}
                            </div>
                            <div className="text-xs text-green-500 dark:text-green-400">Low</div>
                        </div>
                    </div>

                    {/* Total Issues */}
                    <div className="text-center pt-2 border-t dark:border-neutral-700">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {issuesSummary.total} total issues found
                        </span>
                    </div>
                </div>
            )}

            {/* Analyzing State */}
            {project.status === 'Analyzing' && (
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-sm text-neutral-600 dark:text-neutral-400">
                        Analysis in progress...
                    </span>
                </div>
            )}

            {/* Failed State */}
            {project.status === 'Failed' && (
                <div className="text-center py-4">
                    <div className="text-sm text-red-600 dark:text-red-400">
                        Analysis failed. Click to retry.
                    </div>
                </div>
            )}
        </Link>
    );
};

export default EnhancedProjectCard;