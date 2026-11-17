import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, History as HistoryIcon, Trash2 } from 'lucide-react';
import { useTransfer } from '@/src/lib/dropzero/transfer-context';
import { formatBytes, formatDuration, formatTimestamp } from '@/src/lib/dropzero/format';
import { Button } from '@/src/components/ui/button';
import { Tabs } from '@/src/components/ui/tabs';
import { EmptyState } from '@/src/components/ui/states';

export function HistoryPage() {
  const { history, deleteHistoryItem, clearAllHistory } = useTransfer();
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  const filtered = history.filter((item) =>
    filter === 'all' ? true : item.direction === filter
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#252525] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
            Browser IndexedDB Ledger
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Transfer History
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            activeTab={filter}
            onChange={(t) => setFilter(t)}
            tabs={[
              { id: 'all', label: 'All', count: history.length },
              {
                id: 'sent',
                label: 'Sent',
                count: history.filter((h) => h.direction === 'sent').length,
              },
              {
                id: 'received',
                label: 'Received',
                count: history.filter((h) => h.direction === 'received').length,
              },
            ]}
          />
          {history.length > 0 && (
            <Button variant="danger" size="sm" onClick={clearAllHistory}>
              Clear Ledger
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-4 w-4" aria-hidden="true" />}
          title="No recorded transfers"
          description="Completed or failed peer-to-peer transfers appear here and are saved strictly in local browser storage."
          action={
            <Link to="/transfer">
              <Button size="sm" variant="primary">
                Start a Transfer
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] font-mono uppercase tracking-wider text-[#666666] dark:text-[#929292]">
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Payload</th>
                <th className="px-4 py-3">Peer</th>
                <th className="px-4 py-3">Transport</th>
                <th className="px-4 py-3">Size & Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#252525]">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#151515]/60">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[#111111] dark:text-[#F5F5F5]">
                      {entry.direction === 'sent' ? (
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {entry.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#111111] dark:text-[#F5F5F5] truncate max-w-[220px]">
                      {entry.filename}
                    </p>
                    <p className="font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[#666666] dark:text-[#929292]">
                    {entry.deviceName} ({entry.deviceType})
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#666666] dark:text-[#929292]">
                    {entry.transport}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                    {formatBytes(entry.totalBytes)} · {formatDuration(entry.durationMs)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span
                      className={
                        entry.status === 'completed'
                          ? 'text-[#16A34A] dark:text-[#22C55E]'
                          : 'text-[#DC2626] dark:text-[#EF4444]'
                      }
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Delete ${entry.filename}`}
                      onClick={() => deleteHistoryItem(entry.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-[#8A8A8A] hover:text-[#DC2626] dark:hover:text-[#EF4444] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
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
