'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-md border',
        'bg-[#F1F1F1] dark:bg-[#101010] border-[#E5E5E5] dark:border-[#252525]',
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer',
              active
                ? 'bg-[#FFFFFF] dark:bg-[#1A1A1A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#333333]'
                : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] border border-transparent'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
