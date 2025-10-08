import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AcceptedRefactoring {
  id: string;
  issueId: number;
  issueType: string;
  filePath: string;
  description: string;
  suggestedCode: string;
  originalCode: string;
  confidence: number;
  verificationBadge: 'verified' | 'warning' | 'failed';
  validationLayers: any;
}

interface PRResult {
  pullRequest: {
    url: string;
    number: number;
    title: string;
    head: string;
    base: string;
  };
  refactoringsApplied: number;
  filesModified: string[];
  stats: {
    linesAdded: number;
    linesRemoved: number;
    fileChanges: number;
  };
}

interface AcceptedRefactoringsManagerProps {
  projectId: number;
  onClose: () => void;
}

const AcceptedRefactoringsManager: React.FC<AcceptedRefactoringsManagerProps> = ({
  projectId,
  onClose,
}) => {
  const [acceptedRefactorings, setAcceptedRefactorings] = useState<AcceptedRefactoring[]>([]);
  const [selectedRefactorings, setSelectedRefactorings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prResult, setPrResult] = useState<PRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAcceptedRefactorings();
  }, [projectId]);

  const fetchAcceptedRefactorings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/projects/${projectId}/accepted-refactorings`);
      setAcceptedRefactorings(data.refactorings || []);
      // Select all by default
      setSelectedRefactorings(data.refactorings?.map((r: AcceptedRefactoring) => r.id) || []);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch accepted refactorings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRefactoring = (refactoringId: string) => {
    setSelectedRefactorings(prev =>
      prev.includes(refactoringId)
        ? prev.filter(id => id !== refactoringId)
        : [...prev, refactoringId]
    );
  };

  const handleSelectAll = () => {
    setSelectedRefactorings(acceptedRefactorings.map(r => r.id));
  };

  const handleDeselectAll = () => {
    setSelectedRefactorings([]);
  };

  const handleCreatePR = async () => {
    if (selectedRefactorings.length === 0) {
      setError('Please select at least one refactoring to include in the PR');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const { data } = await api.post('/issues/bulk/accept-all', {
        projectId,
        acceptedIssueIds: acceptedRefactorings
          .filter(r => selectedRefactorings.includes(r.id))
          .map(r => r.issueId),
        createPR: true
      });

      if (data.success) {
        setPrResult({
          pullRequest: data.pullRequest,
          refactoringsApplied: data.stats.refactoringsApplied,
          filesModified: data.stats.filesModified,
          stats: {
            linesAdded: data.stats.linesAdded || 0,
            linesRemoved: data.stats.linesRemoved || 0,
            fileChanges: data.stats.filesModified?.length || 0
          }
        });
      } else {
        setError(data.message || 'Failed to create PR');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create PR');
    } finally {
      setCreating(false);
    }
  };

  const getVerificationBadgeColor = (badge: string) => {
    switch (badge) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVerificationIcon = (badge: string) => {
    switch (badge) {
      case 'verified': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  if (prResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🎉 Pull Request Created Successfully!
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* PR Details */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">Pull Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-800 dark:text-green-200">PR Number:</span>
                  <span className="ml-2 text-green-700 dark:text-green-300">#{prResult.pullRequest.number}</span>
                </div>
                <div>
                  <span className="font-medium text-green-800 dark:text-green-200">Branch:</span>
                  <span className="ml-2 font-mono text-green-700 dark:text-green-300">{prResult.pullRequest.head}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-green-800 dark:text-green-200">Title:</span>
                  <span className="ml-2 text-green-700 dark:text-green-300">{prResult.pullRequest.title}</span>
                </div>
                <div className="md:col-span-2">
                  <a
                    href={prResult.pullRequest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{prResult.refactoringsApplied}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Refactorings Applied</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{prResult.stats.fileChanges}</div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Files Modified</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  +{prResult.stats.linesAdded} -{prResult.stats.linesRemoved}
                </div>
                <div className="text-sm text-indigo-700 dark:text-indigo-300">Lines Changed</div>
              </div>
            </div>

            {/* Files Modified */}
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Files Modified</h3>
              <div className="space-y-2">
                {prResult.filesModified.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{file}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create PR from Accepted Refactorings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading accepted refactorings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : acceptedRefactorings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No accepted refactorings found. Accept some refactoring suggestions first.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header with selection controls */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {acceptedRefactorings.length} Accepted Refactoring{acceptedRefactorings.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedRefactorings.length} selected for PR
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Refactorings list */}
              <div className="space-y-4">
                {acceptedRefactorings.map((refactoring) => (
                  <div
                    key={refactoring.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedRefactorings.includes(refactoring.id)
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500'
                      }`}
                    onClick={() => handleToggleRefactoring(refactoring.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedRefactorings.includes(refactoring.id)}
                          onChange={() => handleToggleRefactoring(refactoring.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">{refactoring.issueType}</span>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getVerificationBadgeColor(refactoring.verificationBadge)}`}>
                              {getVerificationIcon(refactoring.verificationBadge)} {refactoring.verificationBadge.toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {refactoring.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{refactoring.filePath}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{refactoring.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create PR button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePR}
                  disabled={selectedRefactorings.length === 0 || creating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating PR...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Create Pull Request ({selectedRefactorings.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptedRefactoringsManager;