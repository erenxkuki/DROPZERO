'use client';

import React from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { FileProgressItem, TransferMetrics, TransferState } from '@/lib/dropzero/types';
import { formatBytes, formatDuration, formatEta, formatSpeed } from '@/lib/dropzero/format';
import { ProgressBar } from '@/components/ui/progress';
import { StatusIndicator } from '@/components/ui/indicators';
import { Button } from '@/components/ui/button';
import { FileCard } from './file-card';
import { cn } from '@/lib/utils';

export function TransferCard({
  state,
  role,
  peerName,
  metrics,
  onPause,
  onResume,
  onCancel,
  onRetry,
  className,
}: {
  state: TransferState;
  role: 'sender' | 'receiver' | null;
  peerName?: string;
  metrics: TransferMetrics;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}) {
  const isTransferring = state === 'TRANSFERRING';
  const isPaused = state === 'PAUSED';
  const isVerifying = state === 'VERIFYING';

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border p-5',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <StatusIndicator state={state} />
            {peerName && (
              <span className="text-xs text-[#666666] dark:text-[#929292]">
                · {role === 'sender' ? 'Sending to' : 'Receiving from'} {peerName}
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs tabular-nums text-[#666666] dark:text-[#929292]">
            {formatBytes(metrics.bytesTransferred)} / {formatBytes(metrics.totalBytes)} ·{' '}
            {metrics.percentage.toFixed(1)}%
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTransferring && onPause && (
            <Button size="sm" variant="secondary" onClick={onPause}>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pause</span>
            </Button>
          )}
          {isPaused && onResume && (
            <Button size="sm" variant="primary" onClick={onResume}>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resume</span>
            </Button>
          )}
          {(isTransferring || isPaused || isVerifying || state === 'CONNECTING') && onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel</span>
            </Button>
          )}
          {state === 'FAILED' && onRetry && (
            <Button size="sm" variant="primary" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      <ProgressBar value={metrics.percentage} indeterminate={isVerifying} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E5E5E5] dark:border-[#252525]">
        <div>
          <span className="block text-[11px] text-[#666666] dark:text-[#929292]">Current speed</span>
          <span className="font-mono text-xs font-medium tabular-nums text-[#111111] dark:text-[#F5F5F5]">
            {formatSpeed(metrics.smoothedSpeedBps)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-[#666666] dark:text-[#929292]">Average speed</span>
          <span className="font-mono text-xs font-medium tabular-nums text-[#111111] dark:text-[#F5F5F5]">
            {formatSpeed(metrics.averageSpeedBps)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-[#666666] dark:text-[#929292]">Remaining</span>
          <span className="font-mono text-xs font-medium tabular-nums text-[#111111] dark:text-[#F5F5F5]">
            {state === 'COMPLETED' ? '0s' : formatEta(metrics.etaSeconds)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-[#666666] dark:text-[#929292]">Elapsed</span>
          <span className="font-mono text-xs font-medium tabular-nums text-[#111111] dark:text-[#F5F5F5]">
            {formatDuration(metrics.elapsedMs)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TransferQueue({
  files,
  maxConcurrent,
}: {
  files: FileProgressItem[];
  maxConcurrent: number;
}) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-[#666666] dark:text-[#929292]">
        <span className="font-medium text-[#111111] dark:text-[#F5F5F5]">
          Transfer queue ({files.length})
        </span>
        <span className="font-mono tabular-nums">Max concurrency {maxConcurrent}</span>
      </div>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-0.5">
        {files.map((item) => (
          <FileCard
            key={item.id}
            name={item.name}
            relativePath={item.relativePath}
            size={item.size}
            status={item.status}
            transferredBytes={item.transferredBytes}
            blake3Hash={item.blake3Computed || item.blake3Expected}
            downloadUrl={item.downloadUrl}
          />
        ))}
      </div>
    </div>
  );
}
