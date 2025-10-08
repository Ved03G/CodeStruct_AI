import React, { useEffect } from 'react';
import DarkModeToggle from '../components/DarkModeToggle';

const LoginSuccess: React.FC = () => {
  useEffect(() => {
    // Authentication is already handled by backend via cookies
    // Just redirect to dashboard after a brief delay
    const timer = setTimeout(() => {
      window.location.assign('/dashboard');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 flex items-center justify-between">
      <div className="dark:text-neutral-100">Successfully logged in! Redirecting to dashboard...</div>
      <DarkModeToggle />
    </div>
  );
};

export default LoginSuccess;
