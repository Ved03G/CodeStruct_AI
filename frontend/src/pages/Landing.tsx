import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import DarkModeToggle from '../components/DarkModeToggle';
import SimpleBentoGrid from '../components/SimpleBentoGrid';

const Landing: React.FC = () => {
  const [me, setMe] = useState<{ authenticated: boolean; user?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const startLogin = () => {
    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    const loginUrl = `${apiBaseURL}/auth/login`;
    window.location.href = loginUrl;
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

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-600 dark:text-neutral-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                CodeStruct
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {me.authenticated ? (
                <>

                  <Link
                    to="/dashboard"
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 transition-colors"
                >
                  View Demo
                </Link>
              )}
              <DarkModeToggle />
              <div className="hidden sm:flex items-center space-x-3 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {(me.user?.username || me.user?.email)?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{me.user?.username || 'User'}</span>
                  {/* <span className="text-xs text-neutral-600 dark:text-neutral-400">Signed in</span> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              <span>AI-Powered Code Analysis</span>
            </div>
          </div>

          {/* Main Heading */}
          <div className="text-center mb-12 animate-slide-up">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-neutral-900 dark:text-neutral-100">
                Elevate Your
              </span>
              <br />
              <span className="text-primary-600 dark:text-primary-500">
                Code Quality
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Analyze complexity, detect code smells, and generate intelligent refactoring suggestions with AI-powered insights.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!me.authenticated ? (
                <>
                  <button
                    onClick={startLogin}
                    className="group px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>Sign in with GitHub</span>
                  </button>

                  <Link
                    to="/dashboard"
                    className="px-8 py-4 bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200 hover:scale-105"
                  >
                    View Demo
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                >
                  <span>Go to Dashboard</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>

            {error && (
              <div className="mt-8 inline-block bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 rounded-xl px-6 py-3 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Built for Developers
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Powerful analysis tools that integrate seamlessly into your workflow
            </p>
          </div>

          <SimpleBentoGrid />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-neutral-200 dark:border-neutral-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg" />
              <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">CodeStruct</span>
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              © 2025 CodeStruct. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
