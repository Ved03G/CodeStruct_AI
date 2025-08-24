import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">CodeStruct Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{user.username || user.email}</span>
                </div>
              )}

              <button
                onClick={handleShowImportModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowImportModal(false)}>
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            {/* Modal positioned on the left */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:ml-4">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Import Git Repository</h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left side - Manual URL Input */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Import from Git URL</h4>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Git Repository URL
                        </label>
                        <input
                          name="gitUrl"
                          type="url"
                          required
                          placeholder="https://github.com/username/repository"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Language will be automatically detected from your repository files
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={importLoading}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
                          'Import Repository'
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right side - GitHub Repositories */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Your GitHub Repositories</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {!repos ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading repositories...</p>
                        </div>
                      ) : (
                        repos.map((r) => (
                          <div key={r.id} className="border dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.name}</h5>
                                <div className="mt-1 flex items-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.private ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                    {r.private ? 'Private' : 'Public'}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  handleImportFromRepo(r);
                                }}
                                disabled={importLoading}
                                className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* GitHub Repositories Section */}
        {showRepos && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">GitHub Repositories</h2>
              <button
                onClick={() => setShowRepos(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!repos ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading repositories...</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {repos.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.name}</h3>
                        <div className="mt-1 flex items-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.private ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                            {r.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={async () => {
                          try {
                            const { data } = await api.post('/analysis/start', { gitUrl: r.clone_url });
                            if (data?.projectId) navigate(`/project/${data.projectId}`);
                          } catch (e: any) {
                            setError(e?.message ?? 'Failed to start analysis');
                          }
                        }}
                        className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Analyze Repository
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Your Projects</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by analyzing your first repository.</p>
              <div className="mt-6">
                <button
                  onClick={handleShowImportModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Project
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} to={`/project/${p.id}`} className="group">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 group-hover:border-blue-300 dark:group-hover:border-blue-500">
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {p.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {p.language}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'Completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : p.status === 'Analyzing'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                        {p.status === 'Analyzing' && (
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {p.status || 'Unknown'}
                      </span>
                    </div>

                    {/* Issue Summary */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Total Issues</span>
                        <span className="font-medium text-gray-900 dark:text-white">{p.issueSummary.total}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-2 py-1 rounded flex justify-between">
                          <span>High Complexity</span>
                          <span className="font-medium">{p.issueSummary.highComplexity}</span>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-2 py-1 rounded flex justify-between">
                          <span>Duplicates</span>
                          <span className="font-medium">{p.issueSummary.duplicateCode}</span>
                        </div>
                        {typeof p.issueSummary.magicNumbers === 'number' && (
                          <div className="bg-pink-50 dark:bg-pink-900 text-pink-700 dark:text-pink-200 px-2 py-1 rounded flex justify-between col-span-2">
                            <span>Magic Numbers</span>
                            <span className="font-medium">{p.issueSummary.magicNumbers}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Project Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        <span>View details</span>
                        <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
