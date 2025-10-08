import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggle } = useTheme();
  return (
    <button
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm transition-colors
        bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50
        dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700 ${className}`}
    >
      <span className="w-4 h-4 inline-block">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
};

export default DarkModeToggle;
