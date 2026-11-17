'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/transfer', label: 'Transfer' },
  { href: '/devices', label: 'Devices' },
  { href: '/features', label: 'Features' },
  { href: '/security', label: 'Security' },
  { href: '/download', label: 'Download' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA]/92 dark:bg-[#080808]/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Brand wordmark */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5] whitespace-nowrap shrink-0"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-[#111111] dark:text-[#F5F5F5] shrink-0"
          >
            <rect
              x="2.5"
              y="2.5"
              width="19"
              height="19"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M8 12h8M13 8.5L16.5 12 13 15.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>DROPZERO</span>
        </Link>

        {/* Zone 2: Center navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm transition-colors duration-150 whitespace-nowrap shrink-0',
                  active
                    ? 'font-medium text-[#111111] dark:text-[#F5F5F5]'
                    : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Theme control + Primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeSwitcher />
          <Link
            href="/transfer"
            className={cn(
              'hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0',
              'bg-[#111111] text-[#FAFAFA] hover:bg-[#262626]',
              'dark:bg-[#F5F5F5] dark:text-[#080808] dark:hover:bg-[#E0E0E0]'
            )}
          >
            Start transferring
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] text-[#111111] dark:text-[#F5F5F5] cursor-pointer"
          >
            {mobileOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#080808] px-4 py-4">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {[
              ...NAV_ITEMS,
              { href: '/history', label: 'History' },
              { href: '/settings', label: 'Settings' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/about', label: 'About' },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center h-11 px-3 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-[#F1F1F1] dark:bg-[#151515] font-medium text-[#111111] dark:text-[#F5F5F5]'
                      : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/transfer"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center h-11 rounded-md text-sm font-medium bg-[#111111] text-[#FAFAFA] dark:bg-[#F5F5F5] dark:text-[#080808]"
            >
              Start transferring
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
