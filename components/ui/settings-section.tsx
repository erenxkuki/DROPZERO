'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] overflow-hidden',
        className
      )}
    >
      <div className="px-6 py-4 border-b border-[#E5E5E5] dark:border-[#252525]">
        <h2 className="text-sm font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-[#666666] dark:text-[#929292]">{description}</p>
        )}
      </div>
      <div className="divide-y divide-[#E5E5E5] dark:divide-[#252525]">
        {React.Children.map(children, (child) =>
          child ? <div className="px-6 py-4">{child}</div> : null
        )}
      </div>
    </section>
  );
}
