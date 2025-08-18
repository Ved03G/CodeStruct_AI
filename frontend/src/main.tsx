import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Project from './pages/Project';
import Landing from './pages/Landing';
import LoginSuccess from './pages/LoginSuccess';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login-success', element: <LoginSuccess /> },
  { path: '/dashboard', element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    )
  },
  { path: '/project/:projectId', element: <Project /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
