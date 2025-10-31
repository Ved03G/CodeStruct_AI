import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import DarkModeToggle from '../components/DarkModeToggle';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  
  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  
  // Statistics
  const [statistics, setStatistics] = useState({
    projects: 0,
    issues: 0,
    refactorings: 0
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/user/profile');
      setDisplayName(data.displayName || data.githubUsername || '');
      setEmail(data.email || '');
      setBio(data.bio || '');
      setStatistics(data.statistics || { projects: 0, issues: 0, refactorings: 0 });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/user/profile', {
        bio
      });
      
      await refreshUser();
      setIsEditing(false);
      alert('Bio updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update bio');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await api.delete('/user/account');
        alert('Account deleted successfully');
        logout();
        navigate('/');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete account');
      }
    }
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
              
              {/* Profile Label */}
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700"></div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Profile</h1>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-400"></div>
            
            {/* Profile Info */}
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-16 mb-4">
                <div className="flex items-end space-x-4">
                  {/* Avatar */}
                  <div className="w-32 h-32 bg-white dark:bg-neutral-900 rounded-xl border-4 border-white dark:border-neutral-900 flex items-center justify-center">
                    <div className="w-28 h-28 bg-primary-600 rounded-lg flex items-center justify-center text-white text-4xl font-bold">
                      {(user?.username || user?.email)?.[0]?.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="pb-2">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {user?.username || 'User'}
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400">{user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  {isEditing ? 'Cancel' : 'Edit Bio'}
                </button>
              </div>

              {/* Connected Account */}
              <div className="mt-6 flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Connected via GitHub</span>
              </div>
            </div>
          </div>

          {/* Profile Details Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Profile Information</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                {/* Display Name - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Display name cannot be changed</p>
                </div>

                {/* Email - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Email is from your GitHub account</p>
                </div>

                {/* Bio - Editable */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {saving && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{saving ? 'Saving...' : 'Save Bio'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Display Name
                  </label>
                  <p className="text-neutral-900 dark:text-neutral-100">{displayName || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Email
                  </label>
                  <p className="text-neutral-900 dark:text-neutral-100">{email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Bio
                  </label>
                  <p className="text-neutral-900 dark:text-neutral-100">{bio || 'No bio added yet'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Statistics Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">{statistics.projects}</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Projects</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">{statistics.issues}</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Issues Found</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">{statistics.refactorings}</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Refactorings</div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
