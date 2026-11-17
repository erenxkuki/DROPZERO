'use client';

import React from 'react';
import { CheckCircle2, Download, File as FileIcon, Folder, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/dropzero/format';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress';

export interface FileCardProps {
  name: string;
  relativePath?: string;
  size: number;
  status?: 'staged' | 'queued' | 'transferring' | 'verifying' | 'verified' | 'failed' | 'cancelled';
  transferredBytes?: number;
  blake3Hash?: string;
  downloadUrl?: string;
  onRemove?: () => void;
}

export function FileCard({
  name,
  relativePath,
  size,
  status = 'staged',
  transferredBytes = 0,
  blake3Hash,
  downloadUrl,
  onRemove,
}: FileCardProps) {
  const isNested = relativePath && relativePath !== name && relativePath.includes('/');
  const pct = size > 0 ? Math.min(100, (transferredBytes / size) * 100) : status === 'verified' ? 100 : 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border px-3.5 py-2.5 transition-colors duration-150',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-[#666666] dark:text-[#929292] shrink-0">
            {isNested ? (
              <Folder className="h-4 w-4" aria-hidden="true" />
            ) : (
              <FileIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5] truncate">
              {isNested ? relativePath : name}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#666666] dark:text-[#929292] font-mono tabular-nums">
              <span>{formatBytes(size)}</span>
              {status !== 'staged' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {status === 'verified'
                      ? 'BLAKE3 verified'
                      : status === 'verifying'
                      ? 'Verifying BLAKE3'
                      : status === 'transferring'
                      ? `${Math.round(pct)}%`
                      : status}
                  </span>
                </>
              )}
              {blake3Hash && (
                <>
                  <span aria-hidden="true">·</span>
                  <span title={blake3Hash}>#{blake3Hash.slice(0, 10)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'verified' && !downloadUrl && (
            <CheckCircle2 className="h-4 w-4 text-[#16A34A] dark:text-[#22C55E]" aria-label="Verified" />
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={name}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium',
                'bg-[#111111] text-[#FAFAFA] dark:bg-[#F5F5F5] dark:text-[#080808]',
                'hover:opacity-90 transition-opacity whitespace-nowrap'
              )}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save</span>
            </a>
          )}
          {onRemove && (
            <IconButton label={`Remove ${name}`} size="sm" onClick={onRemove}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>

      {(status === 'transferring' || status === 'verifying') && (
        <ProgressBar value={pct} indeterminate={status === 'verifying'} />
      )}
    </div>
  );
}
