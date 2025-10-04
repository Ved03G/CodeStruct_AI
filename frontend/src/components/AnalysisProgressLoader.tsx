import React, { useEffect, useState } from 'react';

interface AnalysisStage {
    id: string;
    label: string;
    description: string;
    icon: string;
}

const stages: AnalysisStage[] = [
    {
        id: 'cloning',
        label: 'Cloning Repository',
        description: 'Fetching code from Git repository',
        icon: '📥'
    },
    {
        id: 'detecting',
        label: 'Detecting Language',
        description: 'Analyzing project structure',
        icon: '🔍'
    },
    {
        id: 'parsing',
        label: 'Parsing Files',
        description: 'Building Abstract Syntax Trees',
        icon: '📝'
    },
    {
        id: 'analyzing',
        label: 'Detecting Code Smells',
        description: 'Scanning for quality issues',
        icon: '🔬'
    },
    {
        id: 'duplicates',
        label: 'Checking Duplicates',
        description: 'Finding redundant code patterns',
        icon: '🔄'
    },
    {
        id: 'refactoring',
        label: 'Generating AI Fixes',
        description: 'Creating refactoring suggestions',
        icon: '🤖'
    },
    {
        id: 'pr',
        label: 'Creating Pull Request',
        description: 'Preparing automated PR',
        icon: '🚀'
    },
    {
        id: 'completed',
        label: 'Analysis Complete',
        description: 'Ready for review',
        icon: '✅'
    }
];

interface AnalysisProgressLoaderProps {
    currentStage?: string;
    compact?: boolean;
}

const AnalysisProgressLoader: React.FC<AnalysisProgressLoaderProps> = ({
    currentStage,
    compact = false
}) => {
    const [activeStageIndex, setActiveStageIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // If we have a specific stage from backend, use it
        if (currentStage) {
            const index = stages.findIndex(s => s.id === currentStage);
            if (index !== -1) {
                setActiveStageIndex(index);
                setProgress((index / (stages.length - 1)) * 100);
                return;
            }
        }

        // Otherwise, simulate progress through stages
        const interval = setInterval(() => {
            setActiveStageIndex(prev => {
                const next = prev + 1;
                if (next >= stages.length) {
                    clearInterval(interval);
                    return prev;
                }
                return next;
            });
        }, 3000); // Move to next stage every 3 seconds

        return () => clearInterval(interval);
    }, [currentStage]);

    useEffect(() => {
        setProgress((activeStageIndex / (stages.length - 1)) * 100);
    }, [activeStageIndex]);

    if (compact) {
        return (
            <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {stages[activeStageIndex]?.label}...
                </span>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                        </div>
                        Analysis in Progress
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                        This may take a few minutes for large repositories
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-primary-600 dark:text-primary-500">
                        {Math.round(progress)}%
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Complete</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-8">
                <div
                    className="absolute inset-y-0 left-0 bg-primary-600 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                >
                </div>
            </div>

            {/* Stages List */}
            <div className="space-y-3">
                {stages.map((stage, index) => {
                    const isActive = index === activeStageIndex;
                    const isCompleted = index < activeStageIndex;
                    const isPending = index > activeStageIndex;

                    return (
                        <div
                            key={stage.id}
                            className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 dark:border-primary-700 scale-105 shadow-lg'
                                    : isCompleted
                                        ? 'bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-800'
                                        : 'bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 opacity-60'
                                }`}
                        >
                            {/* Icon/Status */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${isActive
                                    ? 'bg-primary-600 text-white shadow-lg animate-pulse'
                                    : isCompleted
                                        ? 'bg-success-500 text-white'
                                        : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500'
                                }`}>
                                {isCompleted ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : isActive ? (
                                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                                ) : (
                                    <span className="opacity-50 text-sm">{index + 1}</span>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`text-sm font-semibold ${isActive
                                            ? 'text-primary-900 dark:text-primary-100'
                                            : isCompleted
                                                ? 'text-success-900 dark:text-success-100'
                                                : 'text-neutral-500 dark:text-neutral-400'
                                        }`}>
                                        {stage.label}
                                    </h4>
                                    {isActive && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs mt-1 ${isActive
                                        ? 'text-primary-700 dark:text-primary-300'
                                        : isCompleted
                                            ? 'text-success-700 dark:text-success-300'
                                            : 'text-neutral-400 dark:text-neutral-500'
                                    }`}>
                                    {stage.description}
                                </p>
                            </div>

                            {/* Loading Spinner for Active Stage */}
                            {isActive && (
                                <div className="flex-shrink-0">
                                    <svg className="animate-spin h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats */}
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                                {activeStageIndex} completed
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                                1 in progress
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
                            <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                                {stages.length - activeStageIndex - 1} pending
                            </span>
                        </div>
                    </div>
                    <div className="text-neutral-500 dark:text-neutral-400 font-semibold">
                        Step {activeStageIndex + 1} of {stages.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisProgressLoader;
