import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import MagicBento from "../components/MagicBento";

const Landing: React.FC = () => {
  const [me, setMe] = useState<{ authenticated: boolean; user?: any } | null>(null);
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
      <header className="relative z-50 p-6 flex items-center justify-between">
        <div className="text-2xl font-bold text-slate-800">CodeStruct.AI</div>
        <nav className="space-x-6">
          <Link to="/dashboard" className="text-slate-700 hover:text-slate-900 font-medium transition-colors">Dashboard</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
              Tame your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">codebase</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Analyze complexity, spot duplication, and generate safe refactors powered by AI.
            </p>


            {!me.authenticated ? (
              <button
                onClick={startLogin}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
              >
                Sign in with GitHub
              </button>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-6 py-3 inline-block shadow-lg">
                <span className="text-slate-700">Signed in as </span>
                <span className="font-semibold text-blue-600">{me.user?.username}</span>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 max-w-md mx-auto">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}

      <section className="relative py-8">
        <MagicBento
          textAutoHide={true}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={false}
          enableMagnetism={false}
          clickEffect={true}
          spotlightRadius={300}
          particleCount={12}
          glowColor="132, 0, 255"
        />
      </section>
    </div>
  );
};

export default Landing;
