import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'general' | 'notifications' | 'advanced'>('general');

  // Settings state
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [showComplexityWarnings, setShowComplexityWarnings] = useState(true);
  const [complexityThreshold, setComplexityThreshold] = useState(3);

  const handleSaveSettings = () => {
    // TODO: Save settings to backend
    alert('Settings saved successfully!');
  };

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
              
              {/* Settings Label */}
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700"></div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Settings</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('general')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === 'general'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">General</span>
                </button>

                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === 'notifications'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="font-medium">Notifications</span>
                </button>

                <button
                  onClick={() => setActiveSection('advanced')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === 'advanced'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-medium">Advanced</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              {/* General Settings */}
              {activeSection === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">General Settings</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Manage your general preferences</p>
                  </div>

                  <div className="space-y-4">
                    {/* Auto Analysis */}
                    <div className="flex items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Auto-start Analysis</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Automatically start analysis when importing a project</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAnalysis}
                          onChange={(e) => setAutoAnalysis(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {/* Show Complexity Warnings */}
                    <div className="flex items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Complexity Warnings</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Show warnings for high complexity code</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showComplexityWarnings}
                          onChange={(e) => setShowComplexityWarnings(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Notification Settings</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Control how you receive notifications</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">GitHub OAuth Authentication</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Since you're signed in via GitHub, email notifications are not available. 
                          GitHub provides noreply email addresses that cannot receive notifications.
                          In-app notifications will be shown instead.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* In-App Notifications (Always Enabled) */}
                    <div className="flex items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">In-App Notifications</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Show notifications when analysis completes</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">Always On</span>
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              {activeSection === 'advanced' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Advanced Settings</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Configure advanced analysis options</p>
                  </div>

                  {/* Explanation Panel */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">What is Cyclomatic Complexity?</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Complexity measures how many independent paths exist through your code. 
                          More if/else/for/while statements = higher complexity = harder to understand and test.
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-400">
                          <p>• <strong>Lower threshold (1-3):</strong> Catch all complex code, more warnings</p>
                          <p>• <strong>Medium threshold (4-6):</strong> Balance between strictness and practicality</p>
                          <p>• <strong>Higher threshold (7-10):</strong> Only flag very complex code, fewer warnings</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Complexity Threshold */}
                    <div className="py-4 border-b border-neutral-200 dark:border-neutral-800">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Complexity Threshold</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Flag functions with cyclomatic complexity equal to or above this value
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={complexityThreshold}
                            onChange={(e) => setComplexityThreshold(Number(e.target.value))}
                            className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400 w-12 text-center">{complexityThreshold}</span>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                          <span>Strict (More issues)</span>
                          <span>Balanced</span>
                          <span>Lenient (Fewer issues)</span>
                        </div>
                      </div>
                    </div>

                    {/* Preview Info */}
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Current Setting Impact</h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {complexityThreshold <= 3 && "Very strict - will flag most functions with conditional logic. Good for maintaining simple, testable code."}
                        {complexityThreshold > 3 && complexityThreshold <= 6 && "Balanced - flags moderately complex functions. Recommended for most projects."}
                        {complexityThreshold > 6 && "Lenient - only flags highly complex functions. Use if your project naturally has complex business logic."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
