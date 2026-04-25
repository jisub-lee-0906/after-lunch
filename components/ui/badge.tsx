import * as React from 'react';

import { cn } from '@/lib/utils';

type BadgeProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'secondary' | 'outline';
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-tight',
        variant === 'default' && 'badge-strong',
        variant === 'secondary' && 'pill-muted',
        variant === 'outline' && 'badge-outline',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
