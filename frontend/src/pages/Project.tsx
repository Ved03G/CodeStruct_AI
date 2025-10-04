import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import RefactoringView from '../components/RefactoringView';
import EnhancedIssueCard from '../components/EnhancedIssueCard';
import ProjectAnalyticsDashboard from '../components/ProjectAnalyticsDashboard';
import EnhancedIssueFilters from '../components/EnhancedIssueFilters';
import DarkModeToggle from '../components/DarkModeToggle';
import BulkAIRefactorViewer from '../components/BulkAIRefactorViewer';
import AnalysisProgressLoader from '../components/AnalysisProgressLoader';
import { EnhancedIssue, ProjectData } from '../types/analysis';

const Project: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [ast, setAst] = useState<{ filePath: string; language: string; format: string; ast: string } | null>(null);
  const [astLoading, setAstLoading] = useState(false);
  const [astError, setAstError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'analytics' | 'duplicates'>('analytics');

  // Enhanced filtering state
  const [filters, setFilters] = useState({
    issueTypes: [] as string[],
    severities: [] as string[],
    search: '',
    sortBy: 'severity' as 'severity' | 'confidence' | 'type' | 'file',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  // Bulk refactoring state
  const [showBulkRefactor, setShowBulkRefactor] = useState(false);

  const handleBulkRefactor = async () => {
    if (!data?.issues || filteredAndSortedIssues.length === 0) return;
    setShowBulkRefactor(true);
  };

  // Filter and sort issues - moved before early returns
  const filteredAndSortedIssues = React.useMemo(() => {
    if (!data?.issues) return [];

    let filtered = data.issues.filter((issue: EnhancedIssue) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          issue.filePath.toLowerCase().includes(searchLower) ||
          issue.functionName?.toLowerCase().includes(searchLower) ||
          issue.className?.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Issue type filter
      if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(issue.issueType)) {
        return false;
      }

      // Severity filter
      if (filters.severities.length > 0 && !filters.severities.includes(issue.severity)) {
        return false;
      }

      return true;
    });

    // Sort issues
    filtered.sort((a: EnhancedIssue, b: EnhancedIssue) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'severity':
          const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          comparison = severityOrder[b.severity] - severityOrder[a.severity];
          break;
        case 'confidence':
          comparison = b.confidence - a.confidence;
          break;
        case 'type':
          comparison = a.issueType.localeCompare(b.issueType);
          break;
        case 'file':
          comparison = a.filePath.localeCompare(b.filePath);
          break;
      }

      return filters.sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [data?.issues, filters]);

  // Group duplicate issues - moved before early returns
  const duplicateGroups = React.useMemo(() => {
    if (!data?.issues) return [];

    const groups = new Map<string, EnhancedIssue[]>();
    data.issues
      .filter((issue: EnhancedIssue) => issue.duplicateGroupId)
      .forEach((issue: EnhancedIssue) => {
        const groupId = issue.duplicateGroupId!;
        if (!groups.has(groupId)) {
          groups.set(groupId, []);
        }
        groups.get(groupId)!.push(issue);
      });

    return Array.from(groups.entries()).map(([id, issues]) => ({
      id,
      issues,
      affectedFiles: Array.from(new Set(issues.map(i => i.filePath))),
      totalInstances: issues.length
    }));
  }, [data?.issues]);

  // Computed values - moved before early returns
  const filesUnion: string[] = data ? Array.from(new Set([...(data.files || []), ...((data.astFiles as string[]) || [])])) : [];
  const hasAst = (f: string) => (data?.astFiles || []).includes(f);

  useEffect(() => {
    let timer: any;
    const fetchDetails = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}`);
        setData(data);
        // Continue polling while analyzing
        if (data && data.status === 'Analyzing') {
          timer = setTimeout(fetchDetails, 2000);
          setPolling(timer);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
    return () => timer && clearTimeout(timer);
  }, [projectId]);

  const loadAst = async (filePath: string) => {
    if (!projectId) return;
    setSelectedFile(filePath);
    setAst(null);
    setAstError(null);
    setAstLoading(true);
    try {
      const encoded = encodeURIComponent(filePath);
      const { data: resp } = await api.get(`/projects/${projectId}/ast/${encoded}`);
      if (resp && !resp.error) setAst(resp);
      else setAstError('AST not found');
    } catch (e: any) {
      setAstError(e?.message ?? 'Failed to load AST');
    } finally {
      setAstLoading(false);
    }
  };

  // Handle loading and error states in JSX instead of early returns
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-600 dark:text-neutral-400">Loading project...</span>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-800 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-danger-600 dark:text-danger-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-danger-900 dark:text-danger-100 mb-1">Error Loading Project</h3>
              <p className="text-danger-700 dark:text-danger-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Project Not Found</h3>
          <p className="text-neutral-600 dark:text-neutral-400">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl flex items-center justify-center transition-colors"
                  title="Back to Dashboard"
                >
                  <svg className="w-5 h-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 bg-neutral-700 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.name}</h1>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {data?.language}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${data?.status === 'Completed'
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                        : data?.status === 'Analyzing'
                          ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                          : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
                      }`}>
                      {data?.status}
                    </span>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {data?.issues?.length || 0} issues found
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DarkModeToggle />
              <button
                className="inline-flex items-center px-4 py-2 bg-neutral-700 dark:bg-neutral-700 hover:bg-neutral-800 dark:hover:bg-neutral-600 text-white text-sm font-semibold rounded-xl transition-colors"
                onClick={async () => {
                  try {
                    await api.post(`/projects/${projectId}/reanalyze`, {});
                    setLoading(true);
                    const { data } = await api.get(`/projects/${projectId}`);
                    setData(data);
                  } catch (e: any) {
                    setError(e?.message ?? 'Failed to start re-analysis');
                  }
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-analyze
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Progress - Only show during analysis */}
        {data?.status === 'Analyzing' ? (
          <AnalysisProgressLoader currentStage={data?.analysisStage} />
        ) : (
          <>
            {/* Tab Navigation - Only show after analysis completes */}
            <div className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2">
              <nav className="flex space-x-2">
                {[
                  { id: 'analytics', label: 'Analytics', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, count: data?.issues?.length || 0 },
                  { id: 'issues', label: 'Issues', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>, count: filteredAndSortedIssues.length },
                  { id: 'duplicates', label: 'Duplicates', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, count: duplicateGroups.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-900 dark:hover:bg-neutral-600 text-white shadow-lg'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${activeTab === tab.id
                        ? 'bg-white/20'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content - Only show after analysis completes */}
            <div className="grid grid-cols-12 gap-6">
              {/* Sidebar */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                {/* Files List */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Project Files
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                      {filesUnion.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                    {filesUnion.map((f: string) => (
                      <div key={f} className="flex items-center justify-between gap-2 group">
                        <button
                          className={`text-left flex-1 truncate text-xs py-2 px-3 rounded-lg transition-all ${selectedFile === f
                              ? 'font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                            }`}
                          title={f}
                          onClick={() => hasAst(f) ? loadAst(f) : setSelectedFile(f)}
                        >
                          {f.split('/').pop()}
                        </button>
                        {hasAst(f) && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 font-medium">
                            AST
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filters (only show on issues tab) */}
                {activeTab === 'issues' && data?.issues && (
                  <div className="space-y-4">
                    <EnhancedIssueFilters
                      issues={data.issues}
                      filters={filters}
                      onFiltersChange={setFilters}
                    />

                    {/* Bulk Fix Button */}
                    {filteredAndSortedIssues.length > 0 && (
                      <button
                        onClick={handleBulkRefactor}
                        className="w-full bg-accent-600 hover:bg-accent-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors hover:shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI Fix All ({filteredAndSortedIssues.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="col-span-12 lg:col-span-9">
                {activeTab === 'analytics' && data?.issues && (
                  <ProjectAnalyticsDashboard issues={data.issues} />
                )}

                {activeTab === 'issues' && (
                  <div className="space-y-4">
                    {filteredAndSortedIssues.length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                        <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                          {data?.issues?.length === 0 ? 'No Issues Found' : 'No Matching Issues'}
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          {data?.issues?.length === 0
                            ? 'Great job! Your code is clean.'
                            : 'Try adjusting your filters to see more results.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            Showing {filteredAndSortedIssues.length} of {data?.issues?.length || 0} issues
                          </span>
                        </div>
                        {filteredAndSortedIssues.map((issue: EnhancedIssue) => (
                          <EnhancedIssueCard key={issue.id} issue={issue} />
                        ))}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'duplicates' && (
                  <div className="space-y-6">
                    {duplicateGroups.length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                        <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                          No Duplicates Found
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Excellent! Your code has minimal repetition.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            Found {duplicateGroups.length} duplicate groups affecting{' '}
                            {duplicateGroups.reduce((acc, group) => acc + group.totalInstances, 0)} code blocks
                          </span>
                        </div>
                        {duplicateGroups.map((group, index) => (
                          <div key={group.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                Duplicate Group #{index + 1}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="text-xs px-3 py-1 rounded-lg bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 font-medium">
                                  {group.totalInstances} instances
                                </span>
                                <span className="text-xs px-3 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
                                  {group.affectedFiles.length} files
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {group.issues.map((issue: EnhancedIssue) => (
                                <EnhancedIssueCard key={issue.id} issue={issue} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* AST Viewer */}
                <div className="mt-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg">
                  <div className="px-4 py-3 border-b dark:border-slate-700 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">AST Viewer</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[70%]" title={selectedFile || ''}>
                      {selectedFile ? selectedFile : 'Select a file with AST badge from the sidebar'}
                    </div>
                  </div>
                  <div className="p-4">
                    {astLoading && <div className="text-sm text-slate-600 dark:text-slate-400">Loading AST…</div>}
                    {astError && <div className="text-sm text-red-600 dark:text-red-400">{astError}</div>}
                    {!astLoading && !astError && ast && (
                      <div className="space-y-3">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Language: {ast.language} • Format: {ast.format}
                        </div>
                        <pre className="text-xs overflow-auto max-h-96 p-4 bg-slate-50 dark:bg-slate-900/60 border dark:border-slate-700 rounded whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">
                          {ast.ast}
                        </pre>
                      </div>
                    )}
                    {!astLoading && !astError && !ast && (
                      <div className="text-sm text-slate-600 dark:text-slate-300">No AST loaded.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk AI Refactoring Viewer */}
            {showBulkRefactor && (
              <BulkAIRefactorViewer
                issues={filteredAndSortedIssues}
                projectId={Number(projectId)}
                onClose={() => setShowBulkRefactor(false)}
                onComplete={async () => {
                  // Refresh data after completion
                  const { data: refreshedData } = await api.get(`/projects/${projectId}`);
                  setData(refreshedData);
                  setShowBulkRefactor(false);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Project;
