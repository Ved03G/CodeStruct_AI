import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import RefactoringView from '../components/RefactoringView';
import EnhancedIssueCard from '../components/EnhancedIssueCard';
import ProjectAnalyticsDashboard from '../components/ProjectAnalyticsDashboard';
import EnhancedIssueFilters from '../components/EnhancedIssueFilters';
import DarkModeToggle from '../components/DarkModeToggle';
import BulkAIRefactorViewer from '../components/BulkAIRefactorViewer';
import { EnhancedIssue, ProjectData } from '../types/analysis';

const Project: React.FC = () => {
  const { projectId } = useParams();
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
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data?.name}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Language: {data?.language} • Status: {data?.status} •
            {data?.issues?.length || 0} issues found
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <DarkModeToggle />
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
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
            Re-run Analysis
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {data?.status === 'Analyzing' && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-800 dark:border-yellow-300 mr-3"></div>
            Analysis in progress… This can take a few minutes for large repositories.
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b dark:border-slate-700">
        <nav className="flex space-x-8">
          {[
            { id: 'analytics', label: 'Analytics', count: data?.issues?.length || 0 },
            { id: 'issues', label: 'Issues', count: filteredAndSortedIssues.length },
            { id: 'duplicates', label: 'Duplicates', count: duplicateGroups.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Files List */}
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Project Files ({filesUnion.length})
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filesUnion.map((f: string) => (
                <div key={f} className="flex items-center justify-between gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded">
                  <button
                    className={`text-left flex-1 truncate text-xs ${selectedFile === f
                        ? 'font-semibold text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                      }`}
                    title={f}
                    onClick={() => hasAst(f) ? loadAst(f) : setSelectedFile(f)}
                  >
                    {f}
                  </button>
                  {hasAst(f) && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
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
                <div className="flex justify-end">
                  <button
                    onClick={handleBulkRefactor}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Fix All Issues ({filteredAndSortedIssues.length})
                  </button>
                </div>
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
                <div className="text-center py-12 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg">
                  <div className="text-slate-600 dark:text-slate-300">
                    {data?.issues?.length === 0
                      ? 'No issues detected. Great job!'
                      : 'No issues match your current filters.'}
                  </div>
                  {data?.issues?.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Try re-running analysis or analyzing a different branch/repo.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Showing {filteredAndSortedIssues.length} of {data?.issues?.length || 0} issues
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
                <div className="text-center py-12 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg">
                  <div className="text-slate-600 dark:text-slate-300">
                    No duplicate code groups found.
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    This indicates good code organization and minimal repetition.
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Found {duplicateGroups.length} duplicate code groups affecting{' '}
                    {duplicateGroups.reduce((acc, group) => acc + group.totalInstances, 0)} code blocks
                  </div>
                  {duplicateGroups.map((group, index) => (
                    <div key={group.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          Duplicate Group #{index + 1}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span>{group.totalInstances} instances</span>
                          <span>{group.affectedFiles.length} files</span>
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
    </div>
  );
};

export default Project;
