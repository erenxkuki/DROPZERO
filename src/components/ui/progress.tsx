import React from 'react';
import { cn } from '@/src/lib/utils';

export interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'error';
  height?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = false,
  tone = 'default',
  height = 'md',
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  const fillClass: Record<NonNullable<ProgressBarProps['tone']>, string> = {
    default: 'bg-[#111111] dark:bg-[#F5F5F5]',
    success: 'bg-[#16A34A] dark:bg-[#22C55E]',
    warning: 'bg-[#D97706]',
    error: 'bg-[#DC2626] dark:bg-[#EF4444]',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          {label && (
            <span className="truncate text-[#666666] dark:text-[#929292]">{label}</span>
          )}
          {showPercentage && (
            <span className="font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
              {clamped.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'w-full overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-[#252525]',
          height === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className={cn('h-full transition-[width] duration-200 ease-out', fillClass[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 4,
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[#E5E5E5] dark:text-[#252525]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-[#111111] dark:text-[#F5F5F5] transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <span className="absolute font-mono text-xs font-medium tabular-nums text-[#111111] dark:text-[#F5F5F5]">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
