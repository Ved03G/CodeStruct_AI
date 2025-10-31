import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AnalysisProgressLoader from '../components/AnalysisProgressLoader';
import DarkModeToggle from '../components/DarkModeToggle';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[] | null>(null);
  const [showRepos, setShowRepos] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const linkProject = async () => {
    setShowImportModal(true);
  };

  const handleImportFromUrl = async (gitUrl: string) => {
    setImportLoading(true);
    try {
      const { data } = await api.post('/analysis/start', { gitUrl });
      if (data?.projectId) {
        setShowImportModal(false);
        navigate(`/project/${data.projectId}`);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to link project');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportFromRepo = async (repo: any) => {
    setImportLoading(true);
    try {
      const { data } = await api.post('/analysis/start', { gitUrl: repo.clone_url });
      if (data?.projectId) {
        setShowImportModal(false);
        navigate(`/project/${data.projectId}`);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start analysis');
    } finally {
      setImportLoading(false);
    }
  };

  const fetchRepos = async () => {
    if (repos) {
      setShowRepos(!showRepos);
      return;
    }
    try {
      const reposRes = await api.get('/auth/repos');
      setRepos(reposRes.data);
      setShowRepos(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load repositories');
    }
  };

  // Load repos when modal opens if not already loaded
  const handleShowImportModal = () => {
    setShowImportModal(true);
    if (!repos) {
      fetchRepos();
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRes = await api.get('/projects');
        setProjects(projectsRes.data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-600 dark:text-neutral-400 text-lg">Loading your projects...</span>
          <p className="text-neutral-500 dark:text-neutral-500 text-sm max-w-md text-center">
            Fetching your code analysis projects
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Failed to Load Projects
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="relative z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* CodeStruct Home Link */}
              <Link 
                to="/" 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  CodeStruct
                </span>
              </Link>
              
              {/* Dashboard Label */}
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700"></div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {(user.username || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{user.username || user.email}</span>
                </div>
              )}

              <DarkModeToggle />

              <Link
                to="/profile"
                className="inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>

              <Link
                to="/settings"
                className="inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>

              <button
                onClick={handleShowImportModal}
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
              
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Repository Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowImportModal(false)}>
              <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm"></div>
            </div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white dark:bg-neutral-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-neutral-200 dark:border-neutral-800">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Import Repository</h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Start analyzing your codebase in seconds</p>
                  </div>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left side - Manual URL Input */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Import from URL</h4>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const gitUrl = formData.get('gitUrl') as string;
                        if (gitUrl) {
                          handleImportFromUrl(gitUrl);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Git Repository URL
                        </label>
                        <input
                          name="gitUrl"
                          type="url"
                          required
                          placeholder="https://github.com/username/repository"
                          className="block w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-neutral-100 transition-all"
                        />
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                          Language will be automatically detected
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={importLoading}
                        className="w-full inline-flex justify-center items-center px-4 py-3 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {importLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Importing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Import Repository
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right side - GitHub Repositories */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-neutral-800 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Your Repositories</h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                      {!repos ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
                          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">Loading repositories...</p>
                        </div>
                      ) : (
                        repos.map((r) => (
                          <div key={r.id} className="group border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{r.name}</h5>
                                <div className="mt-2 flex items-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${r.private ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                                    }`}>
                                    {r.private ? (
                                      <><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>Private</>
                                    ) : (
                                      <><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" /></svg>Public</>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleImportFromRepo(r)}
                                disabled={importLoading}
                                className="ml-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Import
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 px-4 py-3 rounded-xl flex items-start space-x-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Your Projects</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Manage and track your code analysis projects</p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-neutral-600 dark:text-neutral-400">Loading projects...</span>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">No projects yet</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm mx-auto">Start analyzing your codebase to discover insights and improvements</p>
              <button
                onClick={handleShowImportModal}
                className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 transition-colors hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} to={`/project/${p.id}`} className="group">
                  <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 group-hover:border-primary-300 dark:group-hover:border-primary-700 group-hover:-translate-y-1">
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {p.name}
                        </h3>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {p.language}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${p.status === 'Completed'
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                        : p.status === 'Analyzing'
                          ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                          : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
                        }`}>
                        {p.status === 'Analyzing' && (
                          <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {p.status || 'Unknown'}
                      </span>
                    </div>

                    {/* Progress indicator for analyzing projects */}
                    {p.status === 'Analyzing' && (
                      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                        <AnalysisProgressLoader currentStage={p.analysisStage} compact={true} />
                      </div>
                    )}

                    {/* Issue Summary */}
                    {p.status !== 'Analyzing' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 px-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Issues</span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{p.issueSummary.total}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/50 text-warning-700 dark:text-warning-300 px-3 py-2 rounded-lg">
                            <div className="text-xs font-medium mb-1">High Complexity</div>
                            <div className="text-lg font-bold">{p.issueSummary.highComplexity}</div>
                          </div>
                          <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/50 text-accent-700 dark:text-accent-300 px-3 py-2 rounded-lg">
                            <div className="text-xs font-medium mb-1">Duplicates</div>
                            <div className="text-lg font-bold">{p.issueSummary.duplicateCode}</div>
                          </div>
                          {typeof p.issueSummary.magicNumbers === 'number' && (
                            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50 text-primary-700 dark:text-primary-300 px-3 py-2 rounded-lg col-span-2">
                              <div className="text-xs font-medium mb-1">Magic Numbers</div>
                              <div className="text-lg font-bold">{p.issueSummary.magicNumbers}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Project Button */}
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                        <span>View details</span>
                        <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
