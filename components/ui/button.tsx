import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'icon' | 'tab';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClassName =
  'inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const variantClassNames: Record<ButtonVariant, string> = {
  default: 'button-primary h-11 w-full px-4',
  outline: 'button-outline h-11 w-full px-4',
  secondary: 'button-secondary h-11 w-full px-4',
  icon: 'icon-button h-10 w-10 rounded-2xl p-0',
  tab: 'day-tab h-11 w-full rounded-full px-3 py-2.5 text-[0.95rem]',
};

function Button({ className, variant = 'default', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(baseClassName, variantClassNames[variant], className)} {...props} />;
}

export { Button };
