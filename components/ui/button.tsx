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
        'inline-flex h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        variant === 'outline' && 'border border-orange-200 bg-white text-orange-700 hover:bg-orange-50',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        className,
      )}
      {...props}
    />
  );
}

export { Button };
