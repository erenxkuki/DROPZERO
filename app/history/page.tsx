'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, Trash2 } from 'lucide-react';
import { useTransfer } from '@/lib/dropzero/transfer-context';
import { formatBytes, formatDuration, formatTimestamp } from '@/lib/dropzero/format';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/states';

export default function HistoryPage() {
  const { history, deleteHistoryItem, clearAllHistory } = useTransfer();

  const [query, setQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'largest' | 'fastest'>('newest');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = history.filter((item) => {
      if (directionFilter !== 'all' && item.direction !== directionFilter) return false;
      if (q && !item.filename.toLowerCase().includes(q) && !item.deviceName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'largest') return b.totalBytes - a.totalBytes;
      if (sortBy === 'fastest') {
        const speedA = a.durationMs > 0 ? a.totalBytes / a.durationMs : 0;
        const speedB = b.durationMs > 0 ? b.totalBytes / b.durationMs : 0;
        return speedB - speedA;
      }
      return b.timestamp - a.timestamp;
    });
  }, [history, query, directionFilter, sortBy]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Transfer history
          </h1>
          <p className="mt-1 text-sm text-[#666666] dark:text-[#929292]">
            Stored exclusively in your browser&apos;s local IndexedDB. File contents are never stored or transmitted to analytics.
          </p>
        </div>

        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllHistory}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear history</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666666] dark:text-[#929292]"
            aria-hidden="true"
          />
          <Input
            aria-label="Search transfer history"
            placeholder="Search filename or device..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={directionFilter}
            onChange={(v) => setDirectionFilter(v as 'all' | 'sent' | 'received')}
            items={[
              { value: 'all', label: 'All' },
              { value: 'sent', label: 'Sent' },
              { value: 'received', label: 'Received' },
            ]}
          />
          <Tabs
            value={sortBy}
            onChange={(v) => setSortBy(v as 'newest' | 'largest' | 'fastest')}
            items={[
              { value: 'newest', label: 'Newest' },
              { value: 'largest', label: 'Size' },
              { value: 'fastest', label: 'Rate' },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transfer records found"
          description={
            history.length === 0
              ? 'Completed, failed, or cancelled transfers on this browser appear here automatically.'
              : 'No entries match your current search or filter.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#252525] text-[#666666] dark:text-[#929292]">
                <th className="py-3 px-4 font-medium">File</th>
                <th className="py-3 px-4 font-medium">Direction</th>
                <th className="py-3 px-4 font-medium text-right">Size</th>
                <th className="py-3 px-4 font-medium">Device</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Duration</th>
                <th className="py-3 px-4 font-medium text-right">Date</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#252525]">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#FAFAFA] dark:hover:bg-[#151515] transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-[#111111] dark:text-[#F5F5F5] max-w-[220px] truncate">
                    {item.filename}
                  </td>
                  <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">
                    <span className="inline-flex items-center gap-1">
                      {item.direction === 'sent' ? (
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{item.direction === 'sent' ? 'Sent' : 'Received'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                    {formatBytes(item.totalBytes)}
                  </td>
                  <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">
                    {item.deviceName}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        item.status === 'completed'
                          ? 'text-[#16A34A] dark:text-[#22C55E]'
                          : item.status === 'failed'
                          ? 'text-[#DC2626] dark:text-[#EF4444]'
                          : 'text-[#666666] dark:text-[#929292]'
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#666666] dark:text-[#929292]">
                    {formatDuration(item.durationMs)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#666666] dark:text-[#929292]">
                    {formatTimestamp(item.timestamp)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <IconButton
                      label={`Delete history entry ${item.filename}`}
                      size="sm"
                      onClick={() => deleteHistoryItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
