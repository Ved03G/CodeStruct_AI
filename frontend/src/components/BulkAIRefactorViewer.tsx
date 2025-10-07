import React, { useState } from 'react';
import { api } from '../lib/api';
import { EnhancedIssue } from '../types/analysis';

interface BulkAIRefactorViewerProps {
  issues: EnhancedIssue[];
  projectId: number;
  onClose: () => void;
  onComplete?: () => void;
}

interface RefactoringResult {
  issueId: number;
  issueType: string;
  success: boolean;
  suggestion?: any;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  accepted?: boolean;
  rejected?: boolean;
}

const BulkAIRefactorViewer: React.FC<BulkAIRefactorViewerProps> = ({
  issues,
  projectId,
  onClose,
  onComplete,
}) => {
  const [results, setResults] = useState<RefactoringResult[]>(
    issues.map(issue => ({
      issueId: issue.id,
      issueType: issue.issueType,
      success: false,
      status: 'pending'
    }))
  );
  const [currentProcessing, setCurrentProcessing] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedResult, setSelectedResult] = useState<RefactoringResult | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'results'>('progress');
  const [createPR, setCreatePR] = useState(true);
  const [prCreating, setPrCreating] = useState(false);
  const [prResult, setPrResult] = useState<any>(null);
  const [existingSuggestions, setExistingSuggestions] = useState<any>({});
  const [hasCheckedExisting, setHasCheckedExisting] = useState(false);
  const [showExistingResults, setShowExistingResults] = useState(false);

  // Check for existing suggestions when component mounts
  React.useEffect(() => {
    console.log('BulkAIRefactorViewer mounted, checking existing suggestions...');
    console.log('Issues to check:', issues.map(i => ({ id: i.id, type: i.issueType })));
    checkExistingSuggestions();
  }, []);

  const checkExistingSuggestions = async () => {
    try {
      console.log('Checking for existing suggestions...');
      const suggestions: any = {};
      let hasAnySuggestions = false;
      
      // Reset state first
      setShowExistingResults(false);
      setExistingSuggestions({});
      
      for (const issue of issues) {
        try {
          console.log(`Checking suggestion for issue ${issue.id}...`);
          const response = await api.get(`/issues/${issue.id}/ai-refactor`);
          console.log(`Response for issue ${issue.id}:`, response.data);
          console.log(`Response.data keys:`, Object.keys(response.data));
          console.log(`response.data.success:`, response.data.success);
          console.log(`response.data.hasSuggestion:`, response.data.hasSuggestion);
          console.log(`response.data.suggestion:`, response.data.suggestion);
          
          if (response.data.success && response.data.hasSuggestion) {
            suggestions[issue.id] = response.data.suggestion;
            hasAnySuggestions = true;
            console.log(`✅ Found suggestion for issue ${issue.id}, status: ${response.data.suggestion.status}`);
          } else {
            console.log(`❌ No suggestion found for issue ${issue.id}:`, response.data);
          }
        } catch (error: any) {
          console.log(`❌ Error getting suggestion for issue ${issue.id}:`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
          });
        }
      }
      
      console.log(`Total existing suggestions found: ${Object.keys(suggestions).length}, hasAnySuggestions: ${hasAnySuggestions}`);
      setExistingSuggestions(suggestions);
      setHasCheckedExisting(true);
      
      if (hasAnySuggestions && Object.keys(suggestions).length > 0) {
        console.log(`✅ Setting showExistingResults to true for ${Object.keys(suggestions).length} issues`);
        setShowExistingResults(true);
        loadExistingResults(suggestions);
      } else {
        console.log('❌ No existing suggestions found, staying in ready state');
        setShowExistingResults(false);
      }
    } catch (error) {
      console.error('Error checking existing suggestions:', error);
      setHasCheckedExisting(true);
    }
  };

  const loadExistingResults = (suggestions: any) => {
    const updatedResults = results.map(result => {
      const suggestion = suggestions[result.issueId];
      if (suggestion) {
        return {
          ...result,
          success: true,
          status: 'completed' as const,
          suggestion: {
            refactoredCode: suggestion.refactoredCode,
            originalCode: suggestion.originalCode,
            explanation: suggestion.explanation
          },
          accepted: suggestion.status === 'accepted',
          rejected: suggestion.status === 'rejected'
        };
      }
      return result;
    });
    
    setResults(updatedResults);
    setCompleted(true);
    setActiveTab('results');
  };

  const regenerateAllSuggestions = async (forceRegenerate: boolean = false) => {
    try {
      console.log(`${forceRegenerate ? 'Force regenerating' : 'Generating missing'} suggestions...`);
      
      // Reset states and show progress UI
      setProcessing(true);
      setCompleted(false);
      setShowExistingResults(false);
      setActiveTab('progress');
      
      // Initialize results for progress tracking
      const initialResults = issues.map(issue => ({
        issueId: issue.id,
        issueType: issue.issueType,
        success: false,
        status: 'pending' as const
      }));
      setResults(initialResults);
      
      // Call the bulk regeneration endpoint
      const response = await api.post('/issues/bulk/regenerate-all', {
        projectId: projectId,
        forceRegenerate: forceRegenerate
      });
      
      if (response.data.success) {
        console.log('Regeneration completed:', response.data.summary);
        
        // Mark all as completed
        setResults(prev => prev.map(r => ({
          ...r,
          success: true,
          status: 'completed' as const
        })));
        
        setCompleted(true);
        setProcessing(false);
        
        // Switch to results tab after completion
        setTimeout(() => {
          setActiveTab('results');
        }, 1000);
        
        // Refresh existing suggestions to load the new data
        await checkExistingSuggestions();
      } else {
        throw new Error('Regeneration failed');
      }
    } catch (error) {
      console.error('Error regenerating suggestions:', error);
      setProcessing(false);
      setCompleted(false);
      
      // Mark all as failed
      setResults(prev => prev.map(r => ({
        ...r,
        success: false,
        status: 'failed' as const
      })));
    }
  };

  const processAllIssues = async () => {
    if (showExistingResults) {
      // If we have existing results, just use those
      return;
    }
    
    setProcessing(true);
    setCurrentProcessing(0);

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      setCurrentProcessing(i);
      
      // Update status to processing
      setResults(prev => prev.map(r => 
        r.issueId === issue.id 
          ? { ...r, status: 'processing' as const }
          : r
      ));

      try {
        // Generate AI refactoring for this issue
        const { data } = await api.post(`/issues/${issue.id}/ai-refactor`);
        
        if (data.success) {
          setResults(prev => prev.map(r => 
            r.issueId === issue.id 
              ? { ...r, status: 'completed' as const, success: true, suggestion: data.data }
              : r
          ));
        } else {
          setResults(prev => prev.map(r => 
            r.issueId === issue.id 
              ? { ...r, status: 'failed' as const, success: false, error: data.message || 'Failed to generate refactoring' }
              : r
          ));
        }
      } catch (error: any) {
        setResults(prev => prev.map(r => 
          r.issueId === issue.id 
            ? { ...r, status: 'failed' as const, success: false, error: error.response?.data?.message || 'Failed to generate refactoring' }
            : r
        ));
      }

      // Add delay between requests to avoid overwhelming the API
      if (i < issues.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setCurrentProcessing(null);
    setProcessing(false);
    setCompleted(true);
    setActiveTab('results');
  };

  const acceptSuggestion = async (issueId: number) => {
    try {
      await api.post(`/issues/${issueId}/ai-refactor/accept`);
      setResults(prev => prev.map(r => 
        r.issueId === issueId 
          ? { ...r, accepted: true }
          : r
      ));
    } catch (error: any) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const rejectSuggestion = async (issueId: number) => {
    try {
      await api.post(`/issues/${issueId}/ai-refactor/reject`);
      setResults(prev => prev.map(r => 
        r.issueId === issueId 
          ? { ...r, rejected: true }
          : r
      ));
    } catch (error: any) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const acceptAllSuggestions = async () => {
    // Only accept suggestions that are successful, not already accepted, and not explicitly rejected
    const availableForAcceptance = results.filter(r => 
      r.success && 
      r.suggestion && 
      !r.accepted && 
      !r.rejected
    );
    
    if (availableForAcceptance.length === 0) return;

    try {
      setPrCreating(true);
      
      // Accept all and optionally create PR
      const response = await api.post('/issues/bulk/accept-all', {
        projectId: projectId,
        acceptedIssueIds: availableForAcceptance.map(r => r.issueId),
        createPR: createPR
      });

      if (response.data.pullRequest) {
        setPrResult(response.data.pullRequest);
      }

      // Update local state to mark as accepted
      setResults(prev => prev.map(r => 
        availableForAcceptance.find(a => a.issueId === r.issueId)
          ? { ...r, accepted: true }
          : r
      ));

      if (onComplete) onComplete();
    } catch (error: any) {
      console.error('Failed to accept suggestions:', error);
      alert(`Failed to accept suggestions: ${error.response?.data?.message || error.message}`);
    } finally {
      setPrCreating(false);
    }
  };

  const renderDiff = (result: RefactoringResult) => {
    if (!result.suggestion) return null;

    const originalLines = result.suggestion.originalCode.split('\n');
    const refactoredLines = result.suggestion.refactoredCode.split('\n');

    return (
      <div className="grid grid-cols-2 gap-4">
        {/* Original Code */}
        <div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Original Code
          </div>
          <pre className="text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 overflow-x-auto max-h-96">
            {originalLines.map((line: string, i: number) => {
              const isChanged = result.suggestion.changes?.some((c: any) => c.lineNumber === i + 1 && c.type !== 'add') || false;
              return (
                <div
                  key={i}
                  className={`${
                    isChanged
                      ? 'bg-red-100 dark:bg-red-900/40 border-l-2 border-red-500 pl-2'
                      : ''
                  }`}
                >
                  <span className="text-slate-400 mr-4 select-none">{i + 1}</span>
                  <span className="text-slate-800 dark:text-slate-200">{line}</span>
                </div>
              );
            })}
          </pre>
        </div>

        {/* Refactored Code */}
        <div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Refactored Code
          </div>
          <pre className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 overflow-x-auto max-h-96">
            {refactoredLines.map((line: string, i: number) => {
              const change = result.suggestion.changes?.find((c: any) => c.lineNumber === i + 1);
              const isChanged = !!change;
              const isAdded = change?.type === 'add';
              
              return (
                <div
                  key={i}
                  className={`${
                    isAdded
                      ? 'bg-green-100 dark:bg-green-900/40 border-l-2 border-green-500 pl-2'
                      : isChanged
                      ? 'bg-yellow-100 dark:bg-yellow-900/40 border-l-2 border-yellow-500 pl-2'
                      : ''
                  }`}
                >
                  <span className="text-slate-400 mr-4 select-none">{i + 1}</span>
                  <span className="text-slate-800 dark:text-slate-200">{line}</span>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    );
  };

  const progressPercentage = processing ? 
    ((currentProcessing || 0) / issues.length) * 100 : 
    completed ? 100 : 0;

  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => r.status === 'failed');
  const acceptedResults = results.filter(r => r.accepted);
  const rejectedResults = results.filter(r => r.rejected);
  const availableForAcceptance = results.filter(r => 
    r.success && 
    r.suggestion && 
    !r.accepted && 
    !r.rejected
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                🚀 Bulk AI Refactoring
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Processing {issues.length} code issues with AI-powered refactoring
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          {(processing || completed) && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                <span>
                  {processing ? `Processing issue ${(currentProcessing || 0) + 1} of ${issues.length}` : 'Completed'}
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex mt-4 space-x-1">
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'progress'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Progress
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'results'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Results ({successfulResults.length}/{issues.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {!hasCheckedExisting && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Checking for Existing Suggestions...
                  </h3>
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              )}

              {hasCheckedExisting && showExistingResults && !processing && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Found Existing AI Suggestions!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Found {Object.keys(existingSuggestions).length} existing suggestion{Object.keys(existingSuggestions).length !== 1 ? 's' : ''}. Review them in the Results tab.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => regenerateAllSuggestions(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                      title="Delete all existing suggestions and generate new ones for all issues. This will overwrite everything."
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate All
                    </button>
                    <button
                      onClick={() => regenerateAllSuggestions(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                      title="Only generate suggestions for issues that don't have any existing suggestions. Keeps existing suggestions unchanged."
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Missing Only
                    </button>
                  </div>
                  
                  {/* Button Explanations */}
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600 font-medium">🔄 Regenerate All:</span>
                      <span>Replaces all existing suggestions with new ones</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-medium">➕ Add Missing Only:</span>
                      <span>Keeps existing suggestions, only generates for issues without suggestions</span>
                    </div>
                  </div>
                  
                  {/* PR Status Information */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      📝 About Pull Requests
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      After regenerating suggestions, you'll need to accept them and create a new Pull Request.
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Previous PRs remain unchanged. New suggestions require new PRs to be created.
                    </p>
                  </div>
                </div>
              )}

              {hasCheckedExisting && !showExistingResults && !processing && !completed && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Ready to Process {issues.length} Issues
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Click the button below to start generating AI-powered refactoring suggestions for all selected issues
                  </p>
                  <button
                    onClick={processAllIssues}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start Bulk Refactoring
                  </button>
                </div>
              )}

              {/* Progress List */}
              {(processing || completed) && (
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={result.issueId}
                      className={`p-4 rounded-lg border flex items-center justify-between ${
                        result.status === 'completed' 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : result.status === 'failed'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : result.status === 'processing'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          result.status === 'completed' 
                            ? 'bg-green-500 text-white'
                            : result.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : result.status === 'processing'
                            ? 'bg-blue-500 text-white animate-pulse'
                            : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                        }`}>
                          {result.status === 'completed' ? '✓' : 
                           result.status === 'failed' ? '✗' :
                           result.status === 'processing' ? '⚡' : index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            Issue #{result.issueId} - {result.issueType}
                          </div>
                          {result.error && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              {result.error}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {result.status === 'completed' && result.suggestion && (
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          View Code →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && completed && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {successfulResults.length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Successful</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {failedResults.length}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {acceptedResults.length}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Accepted</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {rejectedResults.length}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">Rejected</div>
                </div>
              </div>

              {/* Accept All Button */}
              {availableForAcceptance.length > 0 && (
                <div className="space-y-4">
                  {/* PR Creation Option */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={createPR}
                        onChange={(e) => setCreatePR(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          🚀 Create Pull Request in GitHub
                        </span>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Automatically create a PR with all accepted refactorings in your original repository
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={acceptAllSuggestions}
                      disabled={prCreating}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                    >
                      {prCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          {createPR ? 'Creating Pull Request...' : 'Accepting Changes...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Accept All & {createPR ? 'Create PR' : 'Apply Changes'} ({availableForAcceptance.length})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Results List */}
              <div className="space-y-4">
                {successfulResults.map((result) => (
                  <div
                    key={result.issueId}
                    className="border dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          ✓
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            Issue #{result.issueId} - {result.issueType}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            AI refactoring suggestion generated successfully
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!result.accepted && !result.rejected && (
                          <>
                            <button
                              onClick={() => acceptSuggestion(result.issueId)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => rejectSuggestion(result.issueId)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {result.accepted && (
                          <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                            Accepted ✓
                          </span>
                        )}
                        {result.rejected && (
                          <span className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm font-medium">
                            Rejected ✗
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedResult(selectedResult?.issueId === result.issueId ? null : result)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-4 py-2 text-sm font-medium"
                        >
                          {selectedResult?.issueId === result.issueId ? 'Hide Code' : 'View Code'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Code Diff */}
                    {selectedResult?.issueId === result.issueId && (
                      <div className="mt-4 border-t dark:border-slate-700 pt-4">
                        {renderDiff(result)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* PR Success Result */}
              {prResult && (
                <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      🎉
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                        Pull Request Created Successfully!
                      </h4>
                      <p className="text-green-700 dark:text-green-300 mb-4">
                        Your refactored code has been pushed to your GitHub repository as <strong>PR #{prResult.number}</strong>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="bg-green-100 dark:bg-green-800/30 rounded p-3">
                          <div className="font-medium text-green-800 dark:text-green-200">Files Modified</div>
                          <div className="text-green-700 dark:text-green-300">{prResult.filesModified || 'Multiple'}</div>
                        </div>
                        <div className="bg-green-100 dark:bg-green-800/30 rounded p-3">
                          <div className="font-medium text-green-800 dark:text-green-200">Branch Created</div>
                          <div className="text-green-700 dark:text-green-300 font-mono text-xs">{prResult.branch}</div>
                        </div>
                      </div>

                      <a
                        href={prResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Pull Request in GitHub
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkAIRefactorViewer;