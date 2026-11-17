import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ThemeSwitcher } from '@/src/components/ui/theme-switcher';
import { Button } from '@/src/components/ui/button';

const NAV_LINKS = [
  { href: '/transfer', label: 'Transfer' },
  { href: '/devices', label: 'Devices' },
  { href: '/history', label: 'History' },
  { href: '/features', label: 'Features' },
  { href: '/security', label: 'Security' },
  { href: '/download', label: 'Download' },
];

export function Header() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA]/90 dark:bg-[#080808]/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="group inline-flex items-center gap-2.5 text-[#111111] dark:text-[#F5F5F5] whitespace-nowrap shrink-0"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect
              x="2"
              y="2"
              width="20"
              height="20"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M7 12H17M17 12L13 8M17 12L13 16"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 ease-out group-hover:translate-x-[1.5px]"
            />
          </svg>
          <span className="font-mono text-sm font-semibold tracking-[0.14em] uppercase">
            DROPZERO
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 h-full"
        >
          {NAV_LINKS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'relative inline-flex h-full items-center text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0',
                  active
                    ? 'text-[#111111] dark:text-[#F5F5F5]'
                    : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
                )}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="dz-nav-underline"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111111] dark:bg-[#F5F5F5]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitcher compact />
          <Link to="/settings" className="hidden sm:inline-flex shrink-0">
            <Button variant="ghost" size="sm">
              Settings
            </Button>
          </Link>
          <Link to="/transfer" className="hidden sm:inline-flex shrink-0">
            <Button variant="primary" size="sm">
              Start Transfer
            </Button>
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] text-[#111111] dark:text-[#F5F5F5] md:hidden cursor-pointer"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#080808] px-4 py-4 md:hidden"
          >
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {[
                ...NAV_LINKS,
                { href: '/settings', label: 'Settings' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/about', label: 'About' },
              ].map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-[#F1F1F1] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5]'
                        : 'text-[#666666] dark:text-[#929292]'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
