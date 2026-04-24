import * as React from 'react';

import { cn } from '@/lib/utils';

type BadgeProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'secondary' | 'outline';
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-tight',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        variant === 'outline' && 'border border-border bg-white text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
