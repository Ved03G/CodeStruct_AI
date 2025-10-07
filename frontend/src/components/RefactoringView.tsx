import React, { useState } from 'react';
import { api } from '../lib/api';
import ReactDiffViewer from 'react-diff-viewer-continued';

type ValidationLayer = {
  passed: boolean;
  message?: string;
};

type ValidationResult = {
  isVerified: boolean;
  confidence: number;
  validationLayers: {
    syntactic: ValidationLayer;
    signature: ValidationLayer;
    structural: ValidationLayer;
    behavioral: ValidationLayer;
  };
  verificationBadge: 'verified' | 'warning' | 'failed';
};

type RefactoringSuggestion = {
  id: string;
  description: string;
  suggestedCode: string;
  confidence: number;
  isVerified?: boolean;
  verificationBadge?: string;
  validationResult?: ValidationResult;
};

type Props = {
  issue: any;
};

const RefactoringView: React.FC<Props> = ({ issue }) => {
  const [suggestion, setSuggestion] = useState<RefactoringSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/issues/${issue.id}/ai-refactor`);
      if (data.success) {
        setSuggestion(data.data);
      } else {
        setError(data.message || 'Failed to generate refactoring suggestion');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (suggestionId: string) => {
    setActionLoading('accept');
    try {
      const { data } = await api.post(`/issues/${issue.id}/ai-refactor/accept`);
      if (data.success) {
        alert('✅ Refactoring accepted! You can now include it in a bulk PR operation.');
        // Could add a callback here to notify parent component
      } else {
        setError(data.message || 'Failed to accept refactoring');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (suggestionId: string) => {
    setActionLoading('reject');
    try {
      const { data } = await api.post(`/issues/${issue.id}/ai-refactor/reject`);
      if (data.success) {
        alert('❌ Refactoring rejected.');
        setSuggestion(null); // Clear the suggestion
      } else {
        setError(data.message || 'Failed to reject refactoring');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reject');
    } finally {
      setActionLoading(null);
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

  const getLayerIcon = (passed: boolean) => passed ? '✅' : '❌';

  return (
    <div className="border rounded-md p-4 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">AI Refactoring Suggestion</h3>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate AI Fix'}
        </button>
      </div>
      
      {error && <div className="text-red-600 mb-2">{error}</div>}
      
      {suggestion && (
        <div className="space-y-4">
          {/* Validation Status */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">RefactoringMirror Validation</h4>
              {suggestion.validationResult && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getVerificationBadgeColor(suggestion.validationResult.verificationBadge)}`}>
                  {getVerificationIcon(suggestion.validationResult.verificationBadge)} {suggestion.validationResult.verificationBadge.toUpperCase()}
                </div>
              )}
            </div>
            
            {suggestion.validationResult && (
              <>
                <div className="mb-2">
                  <span className="text-sm font-medium">Confidence: </span>
                  <span className={`text-sm ${suggestion.validationResult.confidence >= 80 ? 'text-green-600' : suggestion.validationResult.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {suggestion.validationResult.confidence}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    {getLayerIcon(suggestion.validationResult.validationLayers.syntactic.passed)}
                    <span className="ml-2">Syntactic</span>
                  </div>
                  <div className="flex items-center">
                    {getLayerIcon(suggestion.validationResult.validationLayers.signature.passed)}
                    <span className="ml-2">Signature</span>
                  </div>
                  <div className="flex items-center">
                    {getLayerIcon(suggestion.validationResult.validationLayers.structural.passed)}
                    <span className="ml-2">Structural</span>
                  </div>
                  <div className="flex items-center">
                    {getLayerIcon(suggestion.validationResult.validationLayers.behavioral.passed)}
                    <span className="ml-2">Behavioral</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Description */}
          {suggestion.description && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <h4 className="font-medium mb-1">Description</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.description}</p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleAccept(suggestion.id)}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading === 'accept' ? '⏳ Accepting...' : '✅ Accept Refactoring'}
            </button>
            <button
              onClick={() => handleReject(suggestion.id)}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading === 'reject' ? '⏳ Rejecting...' : '❌ Reject Refactoring'}
            </button>
          </div>

          {/* Code Diff */}
          <ReactDiffViewer 
            oldValue={issue.codeBlock} 
            newValue={suggestion.suggestedCode} 
            splitView={true}
            leftTitle="Original Code"
            rightTitle="Suggested Code"
          />
        </div>
      )}
    </div>
  );
};

export default RefactoringView;
