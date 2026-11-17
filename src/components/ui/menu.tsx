import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface MenuOption {
  label: string;
  value: string;
  danger?: boolean;
  onSelect: () => void;
}

export function Dropdown({
  label,
  options,
  className,
}: {
  label: string;
  options: MenuOption[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center justify-between gap-2 h-9 px-3 rounded-md text-xs font-medium',
          'border border-[#E5E5E5] dark:border-[#252525]',
          'bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#F5F5F5]',
          'hover:bg-[#F1F1F1] dark:hover:bg-[#151515] transition-colors cursor-pointer whitespace-nowrap'
        )}
      >
        <span>{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 mt-1.5 min-w-44 rounded-md border p-1 z-40',
            'bg-[#FFFFFF] dark:bg-[#151515] border-[#E5E5E5] dark:border-[#252525]'
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              onClick={() => {
                opt.onSelect();
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer',
                opt.danger
                  ? 'text-[#DC2626] hover:bg-[#DC2626]/10'
                  : 'text-[#111111] dark:text-[#F5F5F5] hover:bg-[#F1F1F1] dark:hover:bg-[#222222]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContextMenu({
  options,
  children,
}: {
  options: MenuOption[];
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos]);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setPos({ x: e.clientX, y: e.clientY });
      }}
    >
      {children}
      {pos && (
        <div
          role="menu"
          style={{ left: pos.x, top: pos.y }}
          className={cn(
            'fixed z-50 min-w-40 rounded-md border p-1',
            'bg-[#FFFFFF] dark:bg-[#151515] border-[#E5E5E5] dark:border-[#252525]'
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              onClick={() => {
                opt.onSelect();
                setPos(null);
              }}
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer',
                opt.danger
                  ? 'text-[#DC2626] hover:bg-[#DC2626]/10'
                  : 'text-[#111111] dark:text-[#F5F5F5] hover:bg-[#F1F1F1] dark:hover:bg-[#222222]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
