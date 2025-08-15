import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Project from './pages/Project';
import Landing from './pages/Landing';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/project/:projectId', element: <Project /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
