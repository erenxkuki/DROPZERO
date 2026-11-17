'use client';

import React from 'react';
import { Globe, Laptop, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/dropzero/format';
import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';

export interface DeviceCardProps {
  name: string;
  deviceType: string;
  platform: string;
  statusLabel: string;
  fingerprint?: string;
  lastSessionAt?: number;
  capabilities?: string[];
  onConnect?: () => void;
  connectLabel?: string;
  onRemove?: () => void;
  isCurrent?: boolean;
}

function DeviceIcon({ type }: { type: string }) {
  const lower = type.toLowerCase();
  if (lower.includes('android')) return <Smartphone className="h-4 w-4" aria-hidden="true" />;
  if (lower.includes('mac')) return <Laptop className="h-4 w-4" aria-hidden="true" />;
  if (lower.includes('windows') || lower.includes('linux')) {
    return <Monitor className="h-4 w-4" aria-hidden="true" />;
  }
  return <Globe className="h-4 w-4" aria-hidden="true" />;
}

export function DeviceCard({
  name,
  deviceType,
  platform,
  statusLabel,
  fingerprint,
  lastSessionAt,
  capabilities,
  onConnect,
  connectLabel = 'Pair',
  onRemove,
  isCurrent = false,
}: DeviceCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 transition-colors duration-150',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        'hover:border-[#D4D4D4] dark:hover:border-[#333333]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#F1F1F1] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5]">
            <DeviceIcon type={deviceType} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5] truncate">
                {name}
              </h3>
              {isCurrent && (
                <span className="text-[11px] font-mono text-[#666666] dark:text-[#929292]">
                  This device
                </span>
              )}
            </div>
            <p className="text-xs text-[#666666] dark:text-[#929292] truncate">
              {deviceType} · {platform} · {statusLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onConnect && (
            <Button size="sm" variant="secondary" onClick={onConnect}>
              {connectLabel}
            </Button>
          )}
          {onRemove && (
            <IconButton label={`Remove ${name}`} size="sm" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>

      {(fingerprint || lastSessionAt || (capabilities && capabilities.length > 0)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-[#E5E5E5] dark:border-[#252525] text-[11px] text-[#666666] dark:text-[#929292]">
          {fingerprint && (
            <span className="font-mono truncate max-w-[180px]" title={fingerprint}>
              Key {fingerprint}
            </span>
          )}
          {lastSessionAt && (
            <span>Last session {formatTimestamp(lastSessionAt)}</span>
          )}
          {capabilities && capabilities.length > 0 && (
            <span className="font-mono">{capabilities.join(' · ')}</span>
          )}
        </div>
      )}
    </div>
  );
}
