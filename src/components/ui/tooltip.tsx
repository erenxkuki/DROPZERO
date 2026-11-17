import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
            'px-2.5 py-1 rounded text-xs whitespace-nowrap',
            'bg-[#111111] text-[#FAFAFA] dark:bg-[#F5F5F5] dark:text-[#080808]',
            'border border-[#252525] dark:border-[#E5E5E5]'
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
