import React from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Pause, Play, X, XCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatBytes, formatDuration, formatEta, formatSpeed } from '@/src/lib/dropzero/format';
import { FileProgressItem, TransferMetrics, TransferState } from '@/src/lib/dropzero/types';
import { Button } from '@/src/components/ui/button';
import { ProgressBar } from '@/src/components/ui/progress';
import { FileCard } from './file-card';

export interface TransferCardProps {
  role: 'sender' | 'receiver';
  peerName: string;
  state: TransferState;
  metrics: TransferMetrics;
  fileCount: number;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function TransferCard({
  role,
  peerName,
  state,
  metrics,
  fileCount,
  onPause,
  onResume,
  onCancel,
  className,
}: TransferCardProps) {
  const isPaused = state === 'PAUSED';
  const isActive = state === 'TRANSFERRING' || state === 'VERIFYING' || state === 'PAUSED';
  const isComplete = state === 'COMPLETED';
  const isFailed = state === 'FAILED' || state === 'CANCELLED';

  return (
    <div
      className={cn(
        'rounded-lg border p-5',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#F1F1F1] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5]">
            {role === 'sender' ? (
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              {role === 'sender' ? `Sending to ${peerName}` : `Receiving from ${peerName}`}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-[#666666] dark:text-[#929292] tabular-nums">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} · {formatBytes(metrics.bytesTransferred)} / {formatBytes(metrics.totalBytes)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && !isPaused && onPause && state === 'TRANSFERRING' && (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              Pause
            </Button>
          )}
          {isPaused && onResume && (
            <Button size="sm" variant="primary" onClick={onResume}>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Resume
            </Button>
          )}
          {isActive && onCancel && (
            <Button size="sm" variant="danger" onClick={onCancel}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </Button>
          )}
          {isComplete && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#16A34A] dark:text-[#22C55E]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Verified
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#DC2626] dark:text-[#EF4444]">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {state === 'CANCELLED' ? 'Cancelled' : 'Failed'}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar
          value={isComplete ? 100 : metrics.percentage}
          showPercentage
          tone={isComplete ? 'success' : isFailed ? 'error' : isPaused ? 'warning' : 'default'}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E5E5E5] dark:border-[#252525]">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
            Rate
          </p>
          <p className="mt-0.5 font-mono text-xs text-[#111111] dark:text-[#F5F5F5] tabular-nums">
            {formatSpeed(metrics.smoothedSpeedBps ?? metrics.currentSpeedBps)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
            Peak / Avg
          </p>
          <p className="mt-0.5 font-mono text-xs text-[#111111] dark:text-[#F5F5F5] tabular-nums">
            {formatSpeed(metrics.peakSpeedBps)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
            {isComplete ? 'Duration' : 'ETA'}
          </p>
          <p className="mt-0.5 font-mono text-xs text-[#111111] dark:text-[#F5F5F5] tabular-nums">
            {isComplete ? formatDuration(metrics.elapsedMs) : formatEta(metrics.etaSeconds)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
            Chunk / RTT
          </p>
          <p className="mt-0.5 font-mono text-xs text-[#111111] dark:text-[#F5F5F5] tabular-nums">
            {formatBytes(metrics.activeChunkSize)}
            {metrics.rttMs !== null ? ` · ${metrics.rttMs} ms` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TransferQueue({
  items,
  className,
}: {
  items: FileProgressItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <FileCard
          key={item.id}
          name={item.name}
          relativePath={item.relativePath}
          size={item.size}
          status={item.status}
          transferredBytes={item.transferredBytes}
          blake3={item.blake3Computed || item.blake3Expected}
          downloadUrl={item.downloadUrl}
        />
      ))}
    </div>
  );
}
