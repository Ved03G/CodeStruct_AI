import React from 'react';
import { EnhancedIssue } from '../types/analysis';

interface FilterState {
    issueTypes: string[];
    severities: string[];
    search: string;
    sortBy: 'severity' | 'confidence' | 'type' | 'file';
    sortOrder: 'asc' | 'desc';
}

interface Props {
    issues: EnhancedIssue[];
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
}

const allIssueTypes = [
    'LongMethod',
    'GodClass',
    'DeepNesting',
    'LongParameterList',
    'HighComplexity',
    'CognitiveComplexity',
    'DuplicateCode',
    'MagicNumber',
    'DeadCode',
    'FeatureEnvy'
];

const allSeverities = ['Critical', 'High', 'Medium', 'Low'];

const EnhancedIssueFilters: React.FC<Props> = ({ issues, filters, onFiltersChange }) => {
    const issueTypeCounts = React.useMemo(() => {
        return allIssueTypes.reduce((acc, type) => {
            acc[type] = issues.filter(issue => issue.issueType === type).length;
            return acc;
        }, {} as Record<string, number>);
    }, [issues]);

    const severityCounts = React.useMemo(() => {
        return allSeverities.reduce((acc, severity) => {
            acc[severity] = issues.filter(issue => issue.severity === severity).length;
            return acc;
        }, {} as Record<string, number>);
    }, [issues]);

    const handleIssueTypeToggle = (type: string) => {
        const newTypes = filters.issueTypes.includes(type)
            ? filters.issueTypes.filter(t => t !== type)
            : [...filters.issueTypes, type];

        onFiltersChange({ ...filters, issueTypes: newTypes });
    };

    const handleSeverityToggle = (severity: string) => {
        const newSeverities = filters.severities.includes(severity)
            ? filters.severities.filter(s => s !== severity)
            : [...filters.severities, severity];

        onFiltersChange({ ...filters, severities: newSeverities });
    };

    const resetFilters = () => {
        onFiltersChange({
            issueTypes: [],
            severities: [],
            search: '',
            sortBy: 'severity',
            sortOrder: 'desc'
        });
    };

    const activeFiltersCount =
        filters.issueTypes.length +
        filters.severities.length +
        (filters.search ? 1 : 0);

    return (
        <div className="space-y-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Filters & Sorting
                </h3>
                {activeFiltersCount > 0 && (
                    <button
                        onClick={resetFilters}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Clear all ({activeFiltersCount})
                    </button>
                )}
            </div>

            {/* Search */}
            <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                    Search in files/functions
                </label>
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    placeholder="Search..."
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                        Sort by
                    </label>
                    <select
                        value={filters.sortBy}
                        onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as any })}
                        className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="severity">Severity</option>
                        <option value="confidence">Confidence</option>
                        <option value="type">Issue Type</option>
                        <option value="file">File Path</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                        Order
                    </label>
                    <select
                        value={filters.sortOrder}
                        onChange={(e) => onFiltersChange({ ...filters, sortOrder: e.target.value as any })}
                        className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="desc">High to Low</option>
                        <option value="asc">Low to High</option>
                    </select>
                </div>
            </div>

            {/* Severity Filters */}
            <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                    Severity Levels
                </label>
                <div className="flex flex-wrap gap-2">
                    {allSeverities.map(severity => {
                        const count = severityCounts[severity];
                        const isSelected = filters.severities.includes(severity);
                        const colorClass = {
                            Critical: isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                            High: isSelected ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                            Medium: isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                            Low: isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }[severity];

                        return (
                            <button
                                key={severity}
                                onClick={() => handleSeverityToggle(severity)}
                                disabled={count === 0}
                                className={`text-xs px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
                            >
                                {severity} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Issue Type Filters */}
            <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                    Issue Types
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {allIssueTypes.map(type => {
                        const count = issueTypeCounts[type];
                        const isSelected = filters.issueTypes.includes(type);

                        return (
                            <button
                                key={type}
                                onClick={() => handleIssueTypeToggle(type)}
                                disabled={count === 0}
                                className={`text-xs px-3 py-1 rounded transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                <div className="truncate">{type}</div>
                                <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {count} issues
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="border-t dark:border-slate-700 pt-3">
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">
                    Quick Filters
                </label>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onFiltersChange({ ...filters, severities: ['Critical', 'High'] })}
                        className="text-xs px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                        High Priority Only
                    </button>
                    <button
                        onClick={() => onFiltersChange({ ...filters, issueTypes: ['DuplicateCode'] })}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        Duplicates Only
                    </button>
                    <button
                        onClick={() => onFiltersChange({ ...filters, issueTypes: ['HighComplexity', 'CognitiveComplexity'] })}
                        className="text-xs px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                    >
                        Complexity Issues
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnhancedIssueFilters;