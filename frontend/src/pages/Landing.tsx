import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const Landing: React.FC = () => {
  const [me, setMe] = useState<{ authenticated: boolean; user?: any } | null>(null);
  const [repos, setRepos] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const startLogin = () => {
    window.location.href = '/api/auth/login';
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setMe(data);
        if (data?.authenticated) {
          const reposRes = await api.get('/auth/repos');
          setRepos(reposRes.data);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load session');
      }
    };
    load();
  }, []);

  const connectRepo = async (r: any) => {
    try {
      const { data } = await api.post('/analysis/start', { gitUrl: r.clone_url, language: 'typescript' });
      navigate(`/project/${data.projectId}`);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to link repo');
    }
  };

  if (!me) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="p-6 flex items-center justify-between">
        <div className="text-xl font-bold">CodeStruct.AI</div>
        <nav className="space-x-3">
          <Link to="/dashboard" className="text-slate-700 hover:underline">Dashboard</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <section className="text-center py-16">
          <h1 className="text-4xl font-extrabold tracking-tight">Tame your codebase with automated insights</h1>
          <p className="mt-4 text-slate-600">Analyze complexity, spot duplication, and generate safe refactors powered by AI.</p>
          {!me.authenticated ? (
            <button onClick={startLogin} className="mt-8 px-4 py-2 bg-black text-white rounded">Sign in with GitHub</button>
          ) : (
            <div className="mt-8 text-slate-700">Signed in as <span className="font-semibold">{me.user?.username}</span></div>
          )}
          {error && <div className="mt-4 text-red-600">{error}</div>}
        </section>

        {me.authenticated && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold mb-3">Your repositories</h2>
            {!repos ? (
              <div>Loading repos…</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {repos.map((r) => (
                  <div key={r.id} className="border rounded p-4 bg-white">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-sm text-slate-600">{r.private ? 'Private' : 'Public'}</div>
                    <div className="mt-3">
                      <button onClick={() => connectRepo(r)} className="px-3 py-1 bg-green-600 text-white rounded">Analyze</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Landing;
