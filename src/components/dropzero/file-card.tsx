import React from 'react';
import { CheckCircle2, Download, File as FileIcon, Folder, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatBytes } from '@/src/lib/dropzero/format';
import { IconButton } from '@/src/components/ui/icon-button';
import { ProgressBar } from '@/src/components/ui/progress';

export interface FileCardProps {
  name: string;
  relativePath?: string;
  size: number;
  status?: 'staged' | 'queued' | 'transferring' | 'verifying' | 'verified' | 'failed' | 'cancelled';
  transferredBytes?: number;
  blake3?: string;
  downloadUrl?: string;
  onRemove?: () => void;
  className?: string;
}

export function FileCard({
  name,
  relativePath,
  size,
  status = 'staged',
  transferredBytes = 0,
  blake3,
  downloadUrl,
  onRemove,
  className,
}: FileCardProps) {
  const isNested = relativePath && relativePath.includes('/');
  const pct = size > 0 ? Math.min(100, (transferredBytes / size) * 100) : status === 'verified' ? 100 : 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-md border p-3 transition-colors duration-150',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#F1F1F1] dark:bg-[#151515] text-[#666666] dark:text-[#929292]">
            {isNested ? (
              <Folder className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <FileIcon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
              {name}
            </p>
            <p className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-[#666666] dark:text-[#929292] tabular-nums">
              <span>{formatBytes(size)}</span>
              {isNested && relativePath !== name && (
                <span className="truncate text-[#8A8A8A] dark:text-[#626262]">· {relativePath}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === 'verified' && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#16A34A] dark:text-[#22C55E]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
          )}
          {status === 'verifying' && (
            <span className="font-mono text-[11px] text-[#D97706]">Verifying BLAKE3</span>
          )}
          {status === 'failed' && (
            <span className="font-mono text-[11px] text-[#DC2626] dark:text-[#EF4444]">Failed</span>
          )}
          {downloadUrl && status === 'verified' && (
            <a
              href={downloadUrl}
              download={name}
              className="inline-flex h-7 items-center gap-1.5 rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#111111] dark:bg-[#F5F5F5] px-2.5 text-[11px] font-medium text-[#FAFAFA] dark:text-[#080808] hover:opacity-90 whitespace-nowrap"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              Save
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
        <ProgressBar
          value={pct}
          height="sm"
          tone={status === 'verifying' ? 'warning' : 'default'}
        />
      )}

      {blake3 && status === 'verified' && (
        <p className="font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262] truncate">
          BLAKE3 {blake3}
        </p>
      )}
    </div>
  );
}
