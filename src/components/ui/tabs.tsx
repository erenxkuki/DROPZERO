import React from 'react';
import { cn } from '@/src/lib/utils';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  variant?: 'underline' | 'segmented';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'segmented',
  className,
}: TabsProps<T>) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={cn(
          'flex items-center gap-6 border-b border-[#E5E5E5] dark:border-[#252525] overflow-x-auto',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative inline-flex items-center gap-2 py-3 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150',
                isActive
                  ? 'text-[#111111] dark:text-[#F5F5F5]'
                  : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="font-mono text-xs tabular-nums text-[#8A8A8A] dark:text-[#626262]">
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111111] dark:bg-[#F5F5F5]"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center rounded-md border p-1',
        'bg-[#F1F1F1] dark:bg-[#101010] border-[#E5E5E5] dark:border-[#252525]',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150',
              isActive
                ? 'bg-[#FFFFFF] dark:bg-[#1C1C1C] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030]'
                : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] border border-transparent'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="font-mono text-[11px] tabular-nums opacity-75">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
