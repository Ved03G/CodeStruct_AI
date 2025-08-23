import React, { useEffect } from 'react';

const LoginSuccess: React.FC = () => {
  useEffect(() => {
    // Authentication is already handled by backend via cookies
    // Just redirect to dashboard after a brief delay
    const timer = setTimeout(() => {
      window.location.assign('/dashboard');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return <div className="p-6">Successfully logged in! Redirecting to dashboard...</div>;
};

export default LoginSuccess;
