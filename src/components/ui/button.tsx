import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#111111] text-[#FAFAFA] hover:bg-[#262626] dark:bg-[#F5F5F5] dark:text-[#080808] dark:hover:bg-[#E0E0E0] border border-transparent',
      secondary:
        'bg-[#F1F1F1] text-[#111111] hover:bg-[#E5E5E5] dark:bg-[#151515] dark:text-[#F5F5F5] dark:hover:bg-[#222222] border border-[#E5E5E5] dark:border-[#252525]',
      outline:
        'bg-transparent text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#252525] hover:bg-[#F1F1F1] dark:hover:bg-[#151515]',
      ghost:
        'bg-transparent text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F1F1F1] dark:hover:bg-[#151515] border border-transparent',
      danger:
        'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 hover:bg-[#DC2626]/20',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-6 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
