'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, History, Radio, RefreshCw } from 'lucide-react';
import { useTransfer } from '@/lib/dropzero/transfer-context';
import { formatBytes, formatDuration, formatSas, formatSpeed } from '@/lib/dropzero/format';
import { TransferWidget } from '@/components/dropzero/transfer-widget';
import { Button } from '@/components/ui/button';
import { EncryptionBadge, NetworkIndicator, StatusIndicator } from '@/components/ui/indicators';
import { EmptyState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

function TransferWorkspaceInner() {
  const searchParams = useSearchParams();
  const pairParam = searchParams.get('pair') || undefined;

  const {
    state,
    role,
    localDevice,
    remotePeer,
    sasCode,
    sasConfirmed,
    signalingConnected,
    discoverableSessions,
    refreshDiscovery,
    joinSessionByCode,
    startReceiveSession,
    metrics,
    history,
  } = useTransfer();

  const [leftTab, setLeftTab] = useState<'actions' | 'nearby' | 'history'>('actions');

  useEffect(() => {
    refreshDiscovery();
  }, [refreshDiscovery]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Transfer workspace
          </h1>
          <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
            {localDevice.deviceName} · {localDevice.deviceType} · {localDevice.capabilities.join(' · ')}
          </p>
        </div>
        <EncryptionBadge sasVerified={sasConfirmed} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left navigation & discovery rail */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-2">
            <button
              type="button"
              onClick={() => setLeftTab('actions')}
              className={cn(
                'flex items-center gap-2.5 h-10 px-3 rounded-md text-xs font-medium text-left transition-colors cursor-pointer',
                leftTab === 'actions'
                  ? 'bg-[#F1F1F1] dark:bg-[#1A1A1A] text-[#111111] dark:text-[#F5F5F5]'
                  : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
              )}
            >
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Send &amp; Receive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLeftTab('nearby');
                refreshDiscovery();
              }}
              className={cn(
                'flex items-center justify-between h-10 px-3 rounded-md text-xs font-medium text-left transition-colors cursor-pointer',
                leftTab === 'nearby'
                  ? 'bg-[#F1F1F1] dark:bg-[#1A1A1A] text-[#111111] dark:text-[#F5F5F5]'
                  : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
              )}
            >
              <span className="flex items-center gap-2.5">
                <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Nearby sessions</span>
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {discoverableSessions.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('history')}
              className={cn(
                'flex items-center justify-between h-10 px-3 rounded-md text-xs font-medium text-left transition-colors cursor-pointer',
                leftTab === 'history'
                  ? 'bg-[#F1F1F1] dark:bg-[#1A1A1A] text-[#111111] dark:text-[#F5F5F5]'
                  : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
              )}
            >
              <span className="flex items-center gap-2.5">
                <History className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Recent history</span>
              </span>
              <span className="font-mono text-[11px] tabular-nums">{history.length}</span>
            </button>
          </div>

          {leftTab === 'actions' && (
            <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">
                Quick actions
              </h2>
              <Button
                size="sm"
                variant="secondary"
                className="justify-start"
                onClick={startReceiveSession}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Create receiving QR</span>
              </Button>
              <Link
                href="/devices"
                className="text-xs text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]"
              >
                Manage devices →
              </Link>
              <Link
                href="/settings"
                className="text-xs text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]"
              >
                Transport settings →
              </Link>
            </div>
          )}

          {leftTab === 'nearby' && (
            <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">
                  Active signaling peers
                </h2>
                <button
                  type="button"
                  onClick={refreshDiscovery}
                  aria-label="Refresh nearby sessions"
                  className="text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              {discoverableSessions.length === 0 ? (
                <EmptyState
                  title="No nearby sessions"
                  description="Open another tab or device and start a session to see it here."
                  className="py-6 px-3"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {discoverableSessions.map((sess) => (
                    <div
                      key={sess.pairingCode}
                      className="flex items-center justify-between gap-2 rounded border border-[#E5E5E5] dark:border-[#252525] p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate text-[#111111] dark:text-[#F5F5F5]">
                          {sess.deviceName}
                        </p>
                        <p className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
                          {sess.pairingCode} · {sess.mode}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => joinSessionByCode(sess.pairingCode)}
                      >
                        Pair
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {leftTab === 'history' && (
            <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">
                  Recent transfers
                </h2>
                <Link
                  href="/history"
                  className="text-xs text-[#666666] dark:text-[#929292] hover:underline"
                >
                  View all
                </Link>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-[#666666] dark:text-[#929292]">
                  No completed transfers recorded locally yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="border-b last:border-b-0 border-[#E5E5E5] dark:border-[#252525] pb-2 last:pb-0"
                    >
                      <p className="text-xs font-medium truncate text-[#111111] dark:text-[#F5F5F5]">
                        {item.filename}
                      </p>
                      <p className="font-mono text-[11px] text-[#666666] dark:text-[#929292] tabular-nums">
                        {item.direction} · {formatBytes(item.totalBytes)} · {item.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main workspace */}
        <section className="lg:col-span-6">
          <TransferWidget initialPairCode={pairParam} />
        </section>

        {/* Right technical telemetry & peer details */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">
              Transfer telemetry
            </h2>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">State</span>
                <StatusIndicator state={state} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">Role</span>
                <span className="font-mono text-[#111111] dark:text-[#F5F5F5]">
                  {role || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">Transport</span>
                <NetworkIndicator
                  transport={metrics.transport}
                  signalingConnected={signalingConnected}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">Chunk size</span>
                <span className="font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                  {formatBytes(metrics.activeChunkSize)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">Current speed</span>
                <span className="font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                  {formatSpeed(metrics.smoothedSpeedBps)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">Peak speed</span>
                <span className="font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                  {formatSpeed(metrics.peakSpeedBps)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">RTT</span>
                <span className="font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                  {metrics.rttMs !== null ? `${metrics.rttMs} ms` : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#666666] dark:text-[#929292]">Duration</span>
                <span className="font-mono tabular-nums text-[#111111] dark:text-[#F5F5F5]">
                  {formatDuration(metrics.elapsedMs)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4 flex flex-col gap-2.5">
            <h2 className="text-xs font-semibold text-[#111111] dark:text-[#F5F5F5]">
              Connected peer
            </h2>
            {remotePeer ? (
              <div className="flex flex-col gap-1.5 text-xs">
                <p className="font-medium text-[#111111] dark:text-[#F5F5F5]">
                  {remotePeer.deviceName}
                </p>
                <p className="text-[#666666] dark:text-[#929292]">
                  {remotePeer.deviceType} · {remotePeer.platform}
                </p>
                {remotePeer.fingerprint && (
                  <p className="font-mono text-[11px] text-[#666666] dark:text-[#929292] break-all">
                    ECDH {remotePeer.fingerprint}
                  </p>
                )}
                {sasCode && (
                  <p className="font-mono text-xs text-[#111111] dark:text-[#F5F5F5]">
                    SAS {formatSas(sasCode)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#666666] dark:text-[#929292]">
                No peer connected yet. Pair via 6-character code or QR link.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function TransferPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 text-xs text-[#666666] dark:text-[#929292]">
          Loading transfer workspace...
        </div>
      }
    >
      <TransferWorkspaceInner />
    </Suspense>
  );
}
