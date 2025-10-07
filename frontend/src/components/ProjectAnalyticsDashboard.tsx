import React from 'react';
import { ProjectAnalytics, EnhancedIssue } from '../types/analysis';

interface Props {
    issues: EnhancedIssue[];
}

const ProjectAnalyticsDashboard: React.FC<Props> = ({ issues }) => {
    // Calculate analytics from issues
    const analytics = React.useMemo(() => {
        const totalIssues = issues.length;

        const issuesBySeverity = issues.reduce((acc, issue) => {
            acc[issue.severity] = (acc[issue.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const issuesByType = issues.reduce((acc, issue) => {
            acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate quality score (0-100)
        const criticalWeight = 10;
        const highWeight = 5;
        const mediumWeight = 2;
        const lowWeight = 1;

        const severityScore =
            (issuesBySeverity.Critical || 0) * criticalWeight +
            (issuesBySeverity.High || 0) * highWeight +
            (issuesBySeverity.Medium || 0) * mediumWeight +
            (issuesBySeverity.Low || 0) * lowWeight;

        const maxPossibleScore = totalIssues * criticalWeight;
        const qualityScore = maxPossibleScore > 0
            ? Math.max(0, Math.round(100 - (severityScore / maxPossibleScore) * 100))
            : 100;

        // Group duplicate issues
        const duplicateGroups = new Map<string, EnhancedIssue[]>();
        issues.filter(issue => issue.duplicateGroupId).forEach(issue => {
            const groupId = issue.duplicateGroupId!;
            if (!duplicateGroups.has(groupId)) {
                duplicateGroups.set(groupId, []);
            }
            duplicateGroups.get(groupId)!.push(issue);
        });

        return {
            totalIssues,
            issuesBySeverity,
            issuesByType,
            qualityScore,
            duplicateGroupsCount: duplicateGroups.size,
            duplicateInstancesCount: issues.filter(i => i.duplicateGroupId).length
        };
    }, [issues]);

    const getSeverityColor = (severity: string) => {
        const colors = {
            Critical: 'text-red-600 dark:text-red-400',
            High: 'text-orange-600 dark:text-orange-400',
            Medium: 'text-yellow-600 dark:text-yellow-400',
            Low: 'text-green-600 dark:text-green-400'
        };
        return colors[severity as keyof typeof colors] || 'text-neutral-600 dark:text-neutral-400';
    };

    const getQualityScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600 dark:text-green-400';
        if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
        if (score >= 50) return 'text-orange-600 dark:text-orange-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getQualityScoreLabel = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Fair';
        return 'Needs Improvement';
    };

    return (
        <div className="space-y-4">
            {/* Quality Score */}
            <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-4">
                <div className="text-center">
                    <div className={`text-4xl font-bold ${getQualityScoreColor(analytics.qualityScore)}`}>
                        {analytics.qualityScore}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Code Quality Score • {getQualityScoreLabel(analytics.qualityScore)}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                        {analytics.totalIssues}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">Total Issues</div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
                        {analytics.issuesBySeverity.Critical || 0}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">Critical Issues</div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                        {analytics.duplicateGroupsCount}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">Duplicate Groups</div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                        {Object.keys(analytics.issuesByType).length}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">Issue Types</div>
                </div>
            </div>

            {/* Severity Breakdown */}
            <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                    Issues by Severity
                </h3>
                <div className="space-y-2">
                    {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                        const count = analytics.issuesBySeverity[severity] || 0;
                        const percentage = analytics.totalIssues > 0
                            ? Math.round((count / analytics.totalIssues) * 100)
                            : 0;

                        return (
                            <div key={severity} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${severity === 'Critical' ? 'bg-red-500' :
                                            severity === 'High' ? 'bg-orange-500' :
                                                severity === 'Medium' ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                        }`}></div>
                                    <span className="text-sm text-neutral-700 dark:text-neutral-300">{severity}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${getSeverityColor(severity)}`}>
                                        {count}
                                    </span>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                        ({percentage}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Issue Types Breakdown */}
            <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                    Issues by Type
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(analytics.issuesByType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900/60 rounded">
                                <span className="text-xs text-neutral-700 dark:text-neutral-300">{type}</span>
                                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{count}</span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Duplicate Code Analysis */}
            {analytics.duplicateGroupsCount > 0 && (
                <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                        Code Duplication Analysis
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">Duplicate Groups:</span>
                            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                                {analytics.duplicateGroupsCount}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">Total Instances:</span>
                            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                                {analytics.duplicateInstancesCount}
                            </span>
                        </div>
                        {analytics.duplicateInstancesCount > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                💡 Removing duplicates could improve maintainability significantly
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectAnalyticsDashboard;