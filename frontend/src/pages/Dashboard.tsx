import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const linkProject = async () => {
    const gitUrl = window.prompt('Enter Git repository URL (https):');
    if (!gitUrl) return;
    const language = window.prompt('Enter language (e.g., typescript):') || 'typescript';
    try {
      const { data } = await api.post('/analysis/start', { gitUrl, language });
      if (data?.projectId) {
        // show analyzing state then navigate
        navigate(`/project/${data.projectId}`);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to link project');
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjects(data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="space-x-2">
          <a href="/api/auth/login" className="px-3 py-1 bg-black text-white rounded">Sign in</a>
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={linkProject}>Link New Project</button>
        </div>
      </div>
      <div className="grid gap-3">
        {projects.map((p) => (
          <Link key={p.id} to={`/project/${p.id}`} className="block border rounded p-4 bg-white shadow-sm">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-gray-600">Language: {p.language}</div>
            <div className="text-sm">
              Issues: {p.issueSummary.total} (HC: {p.issueSummary.highComplexity}, Dup: {p.issueSummary.duplicateCode})
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
