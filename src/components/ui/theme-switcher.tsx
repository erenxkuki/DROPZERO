import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'dropzero_theme_v1';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const val = window.localStorage.getItem(STORAGE_KEY);
    if (val === 'dark' || val === 'light' || val === 'system') return val;
  } catch {}
  return 'dark';
}

function subscribeTheme(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onMedia = () => callback();
  window.addEventListener('storage', onStorage);
  mql?.addEventListener('change', onMedia);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
    mql?.removeEventListener('change', onMedia);
  };
}

function getThemeSnapshot(): ThemeMode {
  return readStoredTheme();
}

function getServerSnapshot(): ThemeMode {
  return 'dark';
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);
  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
    listeners.forEach((fn) => fn());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next: ThemeMode = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Switch theme (current: ${theme})`}
        title={`Theme: ${theme}`}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150 cursor-pointer shrink-0',
          'border-[#E5E5E5] dark:border-[#252525] text-[#666666] dark:text-[#929292]',
          'hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F1F1F1] dark:hover:bg-[#151515]',
          className
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  const options: Array<{ id: ThemeMode; label: string; icon: React.ReactNode }> = [
    { id: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" aria-hidden="true" /> },
    { id: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className={cn(
        'inline-flex items-center rounded-md border p-1',
        'bg-[#F1F1F1] dark:bg-[#101010] border-[#E5E5E5] dark:border-[#252525]',
        className
      )}
    >
      {options.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors duration-150 whitespace-nowrap shrink-0',
              active
                ? 'bg-[#FFFFFF] dark:bg-[#1C1C1C] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030]'
                : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] border border-transparent'
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
