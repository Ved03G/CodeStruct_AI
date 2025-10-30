import React from 'react';

interface BentoFeature {
    title: string;
    description: string;
    icon: React.ReactNode;
    gradient?: string;
    pattern?: boolean;
}

const features: BentoFeature[] = [
    {
        title: 'Smart Code Analysis',
        description: 'Deep code analysis powered by tree-sitter and advanced AST parsing to detect complexity and code smells.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        gradient: 'from-primary-500/10 to-primary-600/5',
        pattern: true
    },
    {
        title: 'AI Refactoring',
        description: 'Gemini-powered suggestions that generate production-ready code improvements.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
        gradient: 'from-primary-400/10 to-transparent'
    },
    {
        title: 'Duplicate Detection',
        description: 'Find exact, structural, and semantic duplicates across your codebase.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
        gradient: 'from-primary-300/10 to-transparent'
    },
    {
        title: 'GitHub Integration',
        description: 'Seamless OAuth integration with automatic PR creation for approved refactorings.',
        icon: (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
        ),
        gradient: 'from-primary-500/10 to-primary-400/5',
        pattern: true
    },
    {
        title: 'Real-time Progress',
        description: 'Live analysis tracking with detailed stage-by-stage progress visualization.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
        gradient: 'from-primary-400/10 to-transparent'
    },
    {
        title: 'Dark Mode',
        description: 'Beautiful dark mode optimized for long coding sessions with your eyes in mind.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ),
        gradient: 'from-primary-600/10 to-primary-500/5',
        pattern: true
    }
];

const BentoGrid: React.FC = () => {
    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-6 gap-4">
                {/* Row 1 */}
                {/* Smart Code Analysis - Large (spans 2 rows, 4 cols on desktop) */}
                <div className="md:col-span-6 lg:col-span-4 lg:row-span-2 group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[300px] lg:min-h-0">
                    <div className={`absolute inset-0 bg-gradient-to-br ${features[0].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    {features[0].pattern && (
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }} />
                    )}
                    <div className="relative h-full p-8 flex flex-col justify-between">
                        <div>
                            <div className="mb-6 w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                {features[0].icon}
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {features[0].title}
                            </h3>
                            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {features[0].description}
                            </p>
                        </div>
                        <div className="flex items-center text-primary-500 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 mt-4">
                            {/* <span className="text-sm font-medium mr-2">Explore</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg> */}
                        </div>
                    </div>
                </div>

                {/* AI Refactoring - Small (2 cols) */}
                <div className="md:col-span-3 lg:col-span-2 group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[250px]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${features[1].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative h-full p-6 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-all duration-500">
                                {features[1].icon}
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {features[1].title}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {features[1].description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Row 2 - Right side */}
                {/* Duplicate Detection - Small (2 cols) */}
                <div className="md:col-span-3 lg:col-span-2 group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[250px]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${features[2].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative h-full p-6 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-all duration-500">
                                {features[2].icon}
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {features[2].title}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {features[2].description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Row 3 */}
                {/* GitHub Integration - Medium (3 cols) */}
                <div className="md:col-span-3 lg:col-span-3 group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[250px]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${features[3].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    {features[3].pattern && (
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }} />
                    )}
                    <div className="relative h-full p-6 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-all duration-500">
                                {features[3].icon}
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {features[3].title}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {features[3].description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dark Mode - Large (3 cols, 2 rows) */}
                <div className="md:col-span-3 lg:col-span-3 lg:row-span-2 group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[300px] lg:min-h-0">
                    <div className={`absolute inset-0 bg-gradient-to-br ${features[5].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    {features[5].pattern && (
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }} />
                    )}
                    <div className="relative h-full p-8 flex flex-col justify-between">
                        <div>
                            <div className="mb-6 w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
                                {features[5].icon}
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {features[5].title}
                            </h3>
                            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {features[5].description}
                            </p>
                        </div>
                        <div className="flex items-center text-primary-500 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 mt-4">
                            {/* <span className="text-sm font-medium mr-2">Learn more</span> */}
                            {/* <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg> */}
                        </div>
                    </div>
                </div>

                {/* Real-time Progress - Medium (3 cols) */}
                <div className="md:col-span-3 lg:col-span-3 group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[250px]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${features[4].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative h-full p-6 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-all duration-500">
                                {features[4].icon}
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {features[4].title}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {features[4].description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BentoGrid;