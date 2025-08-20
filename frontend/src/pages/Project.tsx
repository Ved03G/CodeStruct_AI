import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import RefactoringView from '../components/RefactoringView';

const Project: React.FC = () => {
  const { projectId } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [filter, setFilter] = useState<'All' | 'HighComplexity' | 'DuplicateCode' | 'MagicNumber'>('All');

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

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-3">
        <div className="border rounded p-3 bg-white shadow-sm">
          <div className="font-semibold mb-2">Files</div>
          <ul className="text-sm space-y-1">
            {data.files.map((f: string) => (
              <li key={f} className="truncate">{f}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="col-span-9 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">{data.name}</div>
            <div className="text-sm text-slate-600">Language: {data.language} • Status: {data.status}</div>
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 bg-slate-700 text-white rounded"
              onClick={async () => {
                try {
                  await api.post(`/projects/${projectId}/reanalyze`, {});
                  // restart polling
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
        {data.status === 'Analyzing' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
            Analysis in progress… This can take a few minutes for large repositories.
          </div>
        )}
        <div className="flex items-center gap-2">
          {(['All', 'HighComplexity', 'DuplicateCode', 'MagicNumber'] as const).map((t) => (
            <button
              key={t}
              className={`px-2 py-1 text-xs rounded ${filter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
          <div className="text-xs text-slate-500 ml-2">Filter issues</div>
        </div>
        {data.issues
          .filter((i: any) => filter === 'All' || i.issueType === filter)
          .map((issue: any) => (
            <div key={issue.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${issue.issueType === 'HighComplexity' ? 'bg-orange-100 text-orange-800' : issue.issueType === 'DuplicateCode' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'}`}>{issue.issueType}</span>
                <button
                  className="px-2 py-1 text-xs bg-slate-100 rounded"
                  onClick={() => navigator.clipboard.writeText(issue.codeBlock)}
                >Copy code</button>
              </div>
              <RefactoringView issue={issue} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default Project;
