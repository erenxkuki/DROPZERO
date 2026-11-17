import React from 'react';
import { Globe, Laptop, Monitor, Smartphone, Terminal } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';

export interface DeviceCardProps {
  name: string;
  deviceType: string;
  platform?: string;
  subtitle?: string;
  fingerprint?: string;
  capabilities?: string[];
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: React.ReactNode;
  active?: boolean;
  className?: string;
}

function getDeviceIcon(deviceType: string) {
  const lower = deviceType.toLowerCase();
  if (lower.includes('android') || lower.includes('ios') || lower.includes('phone')) {
    return Smartphone;
  }
  if (lower.includes('mac') || lower.includes('laptop')) {
    return Laptop;
  }
  if (lower.includes('cli') || lower.includes('terminal')) {
    return Terminal;
  }
  if (lower.includes('browser') || lower.includes('web')) {
    return Globe;
  }
  return Monitor;
}

export function DeviceCard({
  name,
  deviceType,
  platform,
  subtitle,
  fingerprint,
  capabilities,
  actionLabel,
  onAction,
  secondaryAction,
  active = false,
  className,
}: DeviceCardProps) {
  const Icon = getDeviceIcon(deviceType);

  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-4 rounded-lg border p-4 transition-colors duration-150',
        active
          ? 'border-[#111111] dark:border-[#F5F5F5] bg-[#FAFAFA] dark:bg-[#151515]'
          : 'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#F1F1F1] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              {name}
            </h3>
            <p className="mt-0.5 text-xs text-[#666666] dark:text-[#929292] truncate">
              {deviceType}
              {platform ? ` · ${platform}` : ''}
            </p>
            {subtitle && (
              <p className="mt-1 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {secondaryAction}
      </div>

      {(fingerprint || (capabilities && capabilities.length > 0) || actionLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E5E5] dark:border-[#252525]">
          <div className="min-w-0">
            {fingerprint && (
              <p className="font-mono text-[11px] text-[#666666] dark:text-[#929292] truncate">
                Key {fingerprint}
              </p>
            )}
            {capabilities && capabilities.length > 0 && (
              <p className="mt-0.5 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262] truncate">
                {capabilities.join(' · ')}
              </p>
            )}
          </div>
          {actionLabel && onAction && (
            <Button size="sm" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
