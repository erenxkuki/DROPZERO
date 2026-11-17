import React from 'react';
import { cn } from '@/src/lib/utils';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        'rounded-lg border p-6',
        'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        className
      )}
    >
      <div className="pb-4 border-b border-[#E5E5E5] dark:border-[#252525]">
        <h2 className="text-base font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="pt-5 space-y-5">{children}</div>
    </section>
  );
}
