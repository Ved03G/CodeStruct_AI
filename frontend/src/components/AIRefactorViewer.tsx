import React, { useState } from 'react';
import { api } from '../lib/api';

interface AIRefactorViewerProps {
  issueId: number;
  issueType: string;
  originalCode: string;
  onClose: () => void;
  onAccept?: () => void;
}

const AIRefactorViewer: React.FC<AIRefactorViewerProps> = ({
  issueId,
  issueType,
  originalCode,
  onClose,
  onAccept,
}) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'original' | 'refactored'>('diff');

  // Fetch existing suggestion on mount
  React.useEffect(() => {
    fetchSuggestion();
  }, [issueId]);

  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/issues/${issueId}/ai-refactor`);
      if (data.success && data.data) {
        setSuggestion(data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch suggestion:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRefactoring = async () => {
    setGenerating(true);
    setError(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      const { data } = await api.post(`/issues/${issueId}/ai-refactor`, {}, {
        signal: controller.signal
      });
      if (data.success) {
        setSuggestion(data.data);
      } else {
        setError(data.message || 'Failed to generate refactoring');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Generation was stopped by user');
      } else {
        setError(err.response?.data?.message || 'Failed to generate refactoring suggestion');
      }
    } finally {
      setGenerating(false);
      setAbortController(null);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setGenerating(false);
      setAbortController(null);
      setError('Generation stopped by user');
    }
  };

  const handleAccept = async () => {
    try {
      await api.post(`/issues/${issueId}/ai-refactor/accept`);
      if (onAccept) onAccept();
      onClose();
    } catch (err: any) {
      setError('Failed to accept suggestion');
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/issues/${issueId}/ai-refactor/reject`);
      onClose();
    } catch (err: any) {
      setError('Failed to reject suggestion');
    }
  };

  const renderDiff = () => {
    if (!suggestion) return null;

    const originalLines = suggestion.originalCode.split('\n');
    const refactoredLines = suggestion.refactoredCode.split('\n');
    const maxLines = Math.max(originalLines.length, refactoredLines.length);

    return (
      <div className="grid grid-cols-2 gap-4">
        {/* Original Code */}
        <div>
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Original Code
          </div>
          <pre className="text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 overflow-x-auto">
            {originalLines.map((line: string, i: number) => {
              const isChanged = suggestion.changes.some((c: any) => c.lineNumber === i + 1 && c.type !== 'add');
              return (
                <div
                  key={i}
                  className={`${isChanged
                      ? 'bg-red-100 dark:bg-red-900/40 border-l-2 border-red-500 pl-2'
                      : ''
                    }`}
                >
                  <span className="text-neutral-400 mr-4 select-none">{i + 1}</span>
                  <span className="text-neutral-800 dark:text-neutral-200">{line}</span>
                </div>
              );
            })}
          </pre>
        </div>

        {/* Refactored Code */}
        <div>
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Refactored Code
          </div>
          <pre className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 overflow-x-auto">
            {refactoredLines.map((line: string, i: number) => {
              const change = suggestion.changes.find((c: any) => c.lineNumber === i + 1);
              const isChanged = !!change;
              const isAdded = change?.type === 'add';

              return (
                <div
                  key={i}
                  className={`${isAdded
                      ? 'bg-green-100 dark:bg-green-900/40 border-l-2 border-green-500 pl-2'
                      : isChanged
                        ? 'bg-yellow-100 dark:bg-yellow-900/40 border-l-2 border-yellow-500 pl-2'
                        : ''
                    }`}
                >
                  <span className="text-neutral-400 mr-4 select-none">{i + 1}</span>
                  <span className="text-neutral-800 dark:text-neutral-200">{line}</span>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                🤖 AI-Powered Refactoring
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Issue Type: <span className="font-semibold">{issueType}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading suggestion...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {!loading && !suggestion && !generating && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                No AI Suggestion Yet
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Generate an AI-powered refactoring suggestion for this code issue
              </p>
              <button
                onClick={generateRefactoring}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                ✨ Generate AI Refactoring
              </button>
            </div>
          )}

          {generating && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                🧠 AI is Thinking...
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Analyzing your code and generating refactoring suggestions
              </p>
              
              {/* Stop Generation Button */}
              <button
                onClick={stopGeneration}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop Generation
              </button>
            </div>
          )}

          {suggestion && (
            <div className="space-y-6">
              {/* Explanation */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">💡</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      AI Explanation
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200">{suggestion.explanation}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="text-blue-700 dark:text-blue-300">
                        Confidence: <strong>{suggestion.confidence}%</strong>
                      </span>
                      <span className="text-blue-700 dark:text-blue-300">
                        Changes: <strong>{suggestion.changes.length} lines</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b dark:border-neutral-700">
                <nav className="flex space-x-8">
                  {[
                    { id: 'diff', label: 'Side-by-Side Diff', icon: '🔄' },
                    { id: 'original', label: 'Original Code', icon: '📄' },
                    { id: 'refactored', label: 'Refactored Code', icon: '✨' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                        }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Code Display */}
              <div className="mt-4">
                {activeTab === 'diff' && renderDiff()}

                {activeTab === 'original' && (
                  <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 border dark:border-neutral-700 rounded p-4 overflow-x-auto">
                    <code className="text-neutral-800 dark:text-neutral-200">{suggestion.originalCode}</code>
                  </pre>
                )}

                {activeTab === 'refactored' && (
                  <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 border dark:border-neutral-700 rounded p-4 overflow-x-auto">
                    <code className="text-neutral-800 dark:text-neutral-200">{suggestion.refactoredCode}</code>
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {suggestion && (
          <div className="p-6 border-t dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleReject}
                className="px-6 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ❌ Reject
              </button>
              <div className="flex gap-3">
                <button
                  onClick={generateRefactoring}
                  disabled={generating}
                  className="px-6 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                >
                  🔄 Regenerate
                </button>
                <button
                  onClick={handleAccept}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  ✅ Accept & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRefactorViewer;
