import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
};

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 h-9 px-4 py-2',
        variant === 'default' ? 'bg-black text-white hover:bg-zinc-800' : 'border border-zinc-300 hover:bg-zinc-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
