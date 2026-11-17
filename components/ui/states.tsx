'use client';

import React from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg border border-dashed',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0D0D0D]',
        className
      )}
    >
      <div className="mb-3 text-[#666666] dark:text-[#626262]">
        {icon || <Inbox className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />}
      </div>
      <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  code,
  title,
  description,
  action,
  className,
}: {
  code?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-5',
        'border-[#DC2626]/30 bg-[#DC2626]/5 text-[#111111] dark:text-[#F5F5F5]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[#DC2626] dark:text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            {code && (
              <span className="font-mono text-[11px] text-[#DC2626] dark:text-[#EF4444]">
                {code}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {action && <div className="flex items-center gap-2 pl-8">{action}</div>}
    </div>
  );
}

export function LoadingState({
  label = 'Loading...',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2.5 py-10 text-xs text-[#666666] dark:text-[#929292]',
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
