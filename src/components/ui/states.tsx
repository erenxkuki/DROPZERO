import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0B0B0B]',
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] text-[#666666] dark:text-[#929292]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  code?: string;
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  className?: string;
}

export function ErrorState({
  code,
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  onSecondaryAction,
  secondaryLabel,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border p-5',
        'border-[#DC2626]/30 dark:border-[#EF4444]/30 bg-[#DC2626]/5 dark:bg-[#EF4444]/5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626] dark:text-[#EF4444]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">{title}</h3>
            {code && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#DC2626] dark:text-[#EF4444]">
                {code}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            {message}
          </p>
          {(onRetry || onSecondaryAction) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  {retryLabel}
                </Button>
              )}
              {onSecondaryAction && secondaryLabel && (
                <Button size="sm" variant="ghost" onClick={onSecondaryAction}>
                  {secondaryLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface LoadingStateProps {
  label?: string;
  detail?: string;
  className?: string;
}

export function LoadingState({ label = 'Initializing session', detail, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border p-8 text-center',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        className
      )}
    >
      <Loader2
        className="h-5 w-5 animate-spin text-[#111111] dark:text-[#F5F5F5]"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">{label}</p>
      {detail && (
        <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">{detail}</p>
      )}
    </div>
  );
}
