import React, { useState } from 'react';
import { api } from '../lib/api';
import ReactDiffViewer from 'react-diff-viewer-continued';

type Props = {
  issue: any;
};

const RefactoringView: React.FC<Props> = ({ issue }) => {
  const [after, setAfter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/issues/${issue.id}/generate-fix`);
      if (data.error) setError(data.error);
      else setAfter(data.suggestedCode || '');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Issue: {issue.issueType}</h3>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate Fix'}
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <ReactDiffViewer oldValue={issue.codeBlock} newValue={after} splitView={true} />
    </div>
  );
};

export default RefactoringView;
