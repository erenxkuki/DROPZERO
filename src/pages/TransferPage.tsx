import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Monitor, Shield } from 'lucide-react';
import { useTransfer } from '@/src/lib/dropzero/transfer-context';
import { formatBytes, formatSas } from '@/src/lib/dropzero/format';
import { TransferWidget } from '@/src/components/dropzero/transfer-widget';

export function TransferPage() {
  const [searchParams] = useSearchParams();
  const initialPair = searchParams.get('pair') || '';

  const {
    localDevice,
    remotePeer,
    sasCode,
    sasConfirmed,
    metrics,
    selectedFiles,
    totalSelectedBytes,
    logs,
    state,
  } = useTransfer();

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#252525] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
            Direct Peer-to-Peer Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Transfer Console
          </h1>
        </div>
        <div className="font-mono text-xs text-[#666666] dark:text-[#929292] tabular-nums">
          Local Node · {localDevice.deviceName} ({localDevice.deviceType})
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              Local Node
            </div>
            <p className="mt-2 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              {localDevice.deviceName}
            </p>
            <p className="mt-0.5 text-xs text-[#666666] dark:text-[#929292]">
              {localDevice.deviceType} · {localDevice.platform}
            </p>
            <p className="mt-2 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262] tabular-nums">
              Staged: {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} (
              {formatBytes(totalSelectedBytes)})
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Session Security
            </div>
            {remotePeer ? (
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-[#8A8A8A] dark:text-[#626262]">Remote Peer</span>
                  <p className="font-medium text-[#111111] dark:text-[#F5F5F5]">
                    {remotePeer.deviceName}
                  </p>
                  <p className="text-[#666666] dark:text-[#929292]">{remotePeer.deviceType}</p>
                </div>
                {remotePeer.fingerprint && (
                  <div>
                    <span className="text-[#8A8A8A] dark:text-[#626262]">Key Fingerprint</span>
                    <p className="font-mono text-[11px] text-[#111111] dark:text-[#F5F5F5] break-all">
                      {remotePeer.fingerprint}
                    </p>
                  </div>
                )}
                {sasCode && (
                  <div>
                    <span className="text-[#8A8A8A] dark:text-[#626262]">SAS Code</span>
                    <p className="font-mono text-sm font-semibold tracking-widest text-[#111111] dark:text-[#F5F5F5] tabular-nums">
                      {formatSas(sasCode)}{' '}
                      <span className="text-[11px] font-normal text-[#666666] dark:text-[#929292]">
                        ({sasConfirmed ? 'Confirmed' : 'Pending'})
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#666666] dark:text-[#929292]">
                Ephemeral ECDH P-256 keypair generated per session when pairing begins.
              </p>
            )}
          </div>
        </aside>

        <main className="lg:col-span-6">
          <TransferWidget initialPairCode={initialPair} />
        </main>

        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Transport Telemetry
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[#666666] dark:text-[#929292]">FSM State</dt>
                <dd className="font-mono text-[#111111] dark:text-[#F5F5F5]">{state}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#666666] dark:text-[#929292]">Path</dt>
                <dd className="font-mono text-[#111111] dark:text-[#F5F5F5]">{metrics.transport}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#666666] dark:text-[#929292]">ICE Candidate</dt>
                <dd className="font-mono text-[#111111] dark:text-[#F5F5F5]">
                  {metrics.iceCandidateType || 'None'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#666666] dark:text-[#929292]">Chunk Size</dt>
                <dd className="font-mono text-[#111111] dark:text-[#F5F5F5] tabular-nums">
                  {formatBytes(metrics.activeChunkSize)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              Local Event Log
            </p>
            {logs.length === 0 ? (
              <p className="mt-2 text-xs text-[#8A8A8A] dark:text-[#626262]">
                No session events recorded yet.
              </p>
            ) : (
              <ul className="mt-2.5 max-h-64 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                {logs.slice(0, 25).map((entry) => (
                  <li key={entry.id} className="leading-snug">
                    <span className="text-[#8A8A8A] dark:text-[#626262]">
                      {new Date(entry.ts).toLocaleTimeString([], {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                    </span>
                    <span
                      className={
                        entry.level === 'error'
                          ? 'text-[#DC2626] dark:text-[#EF4444]'
                          : entry.level === 'warn'
                            ? 'text-[#D97706]'
                            : 'text-[#111111] dark:text-[#F5F5F5]'
                      }
                    >
                      {entry.event}
                      {entry.detail ? (
                        <span className="text-[#8A8A8A] dark:text-[#626262]"> · {entry.detail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
