import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give AuthContext time to check authentication
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Wait 2 seconds for auth check

    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking authentication
  if (isLoading && user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-600 dark:text-neutral-400 text-lg">Checking authentication...</span>
          <p className="text-neutral-500 dark:text-neutral-500 text-sm max-w-md text-center">
            Verifying your login status
          </p>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
