'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, mono = false, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id || autoId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-md px-3 text-sm transition-colors duration-150',
            'bg-[#FFFFFF] dark:bg-[#101010] text-[#111111] dark:text-[#F5F5F5]',
            'border border-[#E5E5E5] dark:border-[#252525]',
            'placeholder:text-[#8A8A8A] dark:placeholder:text-[#626262]',
            'hover:border-[#D4D4D4] dark:hover:border-[#3A3A3A]',
            'focus:outline-none focus:border-[#111111] dark:focus:border-[#F5F5F5]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            mono && 'font-mono tracking-wider',
            error && 'border-[#DC2626] dark:border-[#EF4444]',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#DC2626] dark:text-[#EF4444]">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[#666666] dark:text-[#929292]">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
