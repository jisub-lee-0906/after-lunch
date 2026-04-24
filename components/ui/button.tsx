import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'secondary';
};

function Button({ className, variant = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-[var(--surface-strong)] text-white shadow-sm hover:opacity-95',
        variant === 'outline' && 'border border-[var(--border-soft)] bg-[var(--surface-card)] text-[var(--text-body)] hover:bg-[var(--surface-subtle)]',
        variant === 'secondary' && 'bg-[var(--surface-muted)] text-[var(--text-body)] hover:opacity-90',
        className,
      )}
      {...props}
    />
  );
}

export { Button };
