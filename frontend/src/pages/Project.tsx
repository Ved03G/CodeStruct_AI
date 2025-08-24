import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import RefactoringView from '../components/RefactoringView';
import DarkModeToggle from '../components/DarkModeToggle';

const Project: React.FC = () => {
  const { projectId } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [filter, setFilter] = useState<'All' | 'HighComplexity' | 'DuplicateCode' | 'MagicNumber'>('All');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [ast, setAst] = useState<{ filePath: string; language: string; format: string; ast: string } | null>(null);
  const [astLoading, setAstLoading] = useState(false);
  const [astError, setAstError] = useState<string | null>(null);

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
  if (error) return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  const filesUnion: string[] = data ? Array.from(new Set([...(data.files || []), ...((data.astFiles as string[]) || [])])) : [];

  const hasAst = (f: string) => (data?.astFiles || []).includes(f);

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

  return (
  <div className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-3">
    <div className="border rounded p-3 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
      <div className="font-semibold mb-2 dark:text-slate-100">Files</div>
          <ul className="text-sm space-y-1">
            {filesUnion.map((f: string) => (
              <li key={f} className="truncate flex items-center justify-between gap-2">
                <button
          className={`text-left flex-1 truncate ${selectedFile === f ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                  title={f}
                  onClick={() => hasAst(f) ? loadAst(f) : setSelectedFile(f)}
                >
                  {f}
                </button>
                {hasAst(f) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100">AST</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="col-span-9 space-y-4">
    <div className="flex items-center justify-between">
          <div>
      <div className="text-xl font-semibold dark:text-slate-100">{data.name}</div>
      <div className="text-sm text-slate-600 dark:text-slate-300">Language: {data.language} • Status: {data.status}</div>
          </div>
          <div className="space-x-2">
      <DarkModeToggle />
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
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded">
            Analysis in progress… This can take a few minutes for large repositories.
          </div>
        )}
        <div className="flex items-center gap-2">
          {(['All', 'HighComplexity', 'DuplicateCode', 'MagicNumber'] as const).map((t) => (
            <button
              key={t}
              className={`px-2 py-1 text-xs rounded ${filter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100'}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
          <div className="text-xs text-slate-500 dark:text-slate-400 ml-2">Filter issues</div>
        </div>
        {data.issues.length === 0 && (
          <div className="p-6 text-center text-slate-600 dark:text-slate-300 border rounded bg-white dark:bg-slate-800 dark:border-slate-700">
            No issues detected. You can try re-running analysis, or analyzing a different branch/repo.
          </div>
        )}
        {data.issues
          .filter((i: any) => filter === 'All' || i.issueType === filter)
          .map((issue: any) => (
            <div key={issue.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${issue.issueType === 'HighComplexity' ? 'bg-orange-100 text-orange-800' : issue.issueType === 'DuplicateCode' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'}`}>{issue.issueType}</span>
                <button
                  className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-100 rounded"
                  onClick={() => navigator.clipboard.writeText(issue.codeBlock)}
                >Copy code</button>
              </div>
              <RefactoringView issue={issue} />
            </div>
          ))}

        {/* AST Viewer */}
        <div className="border rounded bg-white dark:bg-slate-800 dark:border-slate-700">
          <div className="px-3 py-2 border-b dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm font-semibold dark:text-slate-100">AST Viewer</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[70%]" title={selectedFile || ''}>
              {selectedFile ? selectedFile : 'Select a file with AST badge from the left'}
            </div>
          </div>
          <div className="p-3">
            {astLoading && <div className="text-sm">Loading AST…</div>}
            {astError && <div className="text-sm text-red-600 dark:text-red-400">{astError}</div>}
            {!astLoading && !astError && ast && (
              <div className="space-y-2">
                <div className="text-xs text-slate-600 dark:text-slate-300">Language: {ast.language} • Format: {ast.format}</div>
                <pre className="text-xs overflow-auto max-h-[480px] p-3 bg-slate-50 dark:bg-slate-900/60 border dark:border-slate-700 rounded whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">
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
  );
};

export default Project;
