'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  indeterminate = false,
  className,
}: {
  value: number;
  indeterminate?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-[#252525]',
        className
      )}
    >
      <div
        style={{ width: indeterminate ? '35%' : `${clamped}%` }}
        className={cn(
          'h-full rounded-full bg-[#111111] dark:bg-[#F5F5F5] transition-all duration-200',
          indeterminate && 'animate-pulse'
        )}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 4,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
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
          className="text-[#111111] dark:text-[#F5F5F5] transition-all duration-200"
        />
      </svg>
      <span className="absolute font-mono text-xs font-medium tabular-nums text-[#111111] dark:text-[#F5F5F5]">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
