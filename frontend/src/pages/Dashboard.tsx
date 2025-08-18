import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    const fetchAll = async () => {
      try {
        const [projectsRes, reposRes] = await Promise.all([
          api.get('/projects'),
          api.get('/auth/repos'),
        ]);
        setProjects(projectsRes.data);
        setRepos(reposRes.data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="space-x-2">
          {user && (
            <span className="text-slate-700">Signed in as <span className="font-semibold">{user.username || user.email || user.id}</span></span>
          )}
          <button className="px-3 py-1 bg-slate-700 text-white rounded" onClick={logout}>Logout</button>
          <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={linkProject}>Link New Project</button>
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Analyzed projects</h2>
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
          {projects.length === 0 && (
            <div className="text-slate-600">No projects yet. Link one or analyze a repo below.</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Your repositories</h2>
        {!repos ? (
          <div>Loading repos…</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {repos.map((r) => (
              <div key={r.id} className="border rounded p-4 bg-white">
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-slate-600">{r.private ? 'Private' : 'Public'}</div>
                <div className="mt-3">
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await api.post('/analysis/start', { gitUrl: r.clone_url, language: 'typescript' });
                        if (data?.projectId) navigate(`/project/${data.projectId}`);
                      } catch (e: any) {
                        setError(e?.message ?? 'Failed to start analysis');
                      }
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
