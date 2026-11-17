import React from 'react';
import { cn } from '@/src/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = 'ghost', size = 'md', children, ...props }, ref) => {
    const variants = {
      ghost:
        'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F1F1F1] dark:hover:bg-[#151515]',
      outline:
        'text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#252525] hover:bg-[#F1F1F1] dark:hover:bg-[#151515]',
      secondary:
        'bg-[#F1F1F1] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5] hover:bg-[#E5E5E5] dark:hover:bg-[#222222]',
    };
    const sizes = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors duration-150 shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
