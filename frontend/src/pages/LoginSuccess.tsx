import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginSuccess: React.FC = () => {
  const { search } = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    if (token) {
      login(token);
    }
  }, [search]);

  return <div className="p-6">Logging you in…</div>;
};

export default LoginSuccess;
