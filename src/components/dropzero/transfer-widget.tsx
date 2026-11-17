import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  FolderPlus,
  QrCode,
  Radio,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useTransfer } from '@/src/lib/dropzero/transfer-context';
import { formatBytes, formatSas } from '@/src/lib/dropzero/format';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Tabs } from '@/src/components/ui/tabs';
import { ErrorState, LoadingState } from '@/src/components/ui/states';
import {
  EncryptionBadge,
  NetworkIndicator,
  SpeedIndicator,
  StatusIndicator,
} from '@/src/components/ui/indicators';
import { useToast } from '@/src/components/ui/toast';
import { FileCard } from './file-card';
import { QRCodeDialog } from './qr-code-dialog';
import { TransferCard, TransferQueue } from './transfer-card';

export interface TransferWidgetProps {
  initialPairCode?: string;
  compact?: boolean;
}

export function TransferWidget({ initialPairCode = '', compact = false }: TransferWidgetProps) {
  const {
    state,
    role,
    error,
    selectedFiles,
    totalSelectedBytes,
    addFiles,
    addDroppedItems,
    removeSelectedFile,
    clearSelectedFiles,
    pairingCode,
    pairingExpiresAt,
    remotePeer,
    sasCode,
    sasConfirmed,
    setSasConfirmed,
    signalingConnected,
    discoverableSessions,
    refreshDiscovery,
    startSendSession,
    startReceiveSession,
    joinSessionByCode,
    sendManifestWhenReady,
    acceptIncomingTransfer,
    rejectIncomingTransfer,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    resetWorkspace,
    switchToRelayFallback,
    incomingManifest,
    fileProgress,
    metrics,
  } = useTransfer();

  const { pushToast } = useToast();
  const [modeTab, setModeTab] = useState<'send' | 'receive'>(initialPairCode ? 'receive' : 'send');
  const [joinCode, setJoinCode] = useState<string>(initialPairCode.toUpperCase());
  const [dragging, setDragging] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialPairCode) {
      setModeTab('receive');
      setJoinCode(initialPairCode.toUpperCase());
    }
  }, [initialPairCode]);

  useEffect(() => {
    if (modeTab === 'receive') {
      refreshDiscovery();
    }
  }, [modeTab, refreshDiscovery]);

  useEffect(() => {
    if (!pairingExpiresAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pairingExpiresAt]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer) {
      await addDroppedItems(e.dataTransfer);
    }
  };

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopiedCode(true);
      pushToast({ title: 'Pairing code copied', tone: 'success' });
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {}
  };

  const handleCopyShareLink = async () => {
    if (!pairingCode || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/transfer?pair=${pairingCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      pushToast({ title: 'Pairing link copied', description: 'Open in another browser tab or device.', tone: 'success' });
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {}
  };

  const expiresInSec =
    pairingExpiresAt !== null ? Math.max(0, Math.floor((pairingExpiresAt - nowMs) / 1000)) : null;

  const isNegotiating =
    state === 'CREATING_SESSION' ||
    state === 'PEER_DETECTED' ||
    state === 'AUTHENTICATING' ||
    state === 'CONNECTING';

  const isRunningOrFinished =
    state === 'TRANSFERRING' ||
    state === 'PAUSED' ||
    state === 'VERIFYING' ||
    state === 'COMPLETED' ||
    state === 'CANCELLED' ||
    state === 'RECOVERING';

  return (
    <div
      className={cn(
        'rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]',
        compact ? 'p-5' : 'p-6'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5] dark:border-[#252525]">
        <div className="flex flex-wrap items-center gap-4">
          <StatusIndicator state={state} />
          <NetworkIndicator
            transport={metrics.transport}
            signalingConnected={signalingConnected}
          />
          {sasCode && <EncryptionBadge verified={sasConfirmed} />}
        </div>

        {(state === 'TRANSFERRING' || state === 'VERIFYING') && (
          <SpeedIndicator speedBps={metrics.smoothedSpeedBps} rttMs={metrics.rttMs} />
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorState
            code={error.code}
            title="Transfer interrupted"
            message={error.message}
            onRetry={resetWorkspace}
            retryLabel="Reset Session"
            onSecondaryAction={
              error.recoverable ? () => switchToRelayFallback() : undefined
            }
            secondaryLabel={error.recoverable ? 'Use Encrypted Relay' : undefined}
          />
        </div>
      )}

      {state === 'AWAITING_ACCEPTANCE' && role === 'receiver' && incomingManifest && (
        <div className="mt-5 space-y-5">
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666] dark:text-[#929292]">
                  Incoming Transfer Request
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
                  {incomingManifest.senderName} wants to send {incomingManifest.files.length}{' '}
                  {incomingManifest.files.length === 1 ? 'file' : 'files'}
                </h3>
                <p className="mt-1 font-mono text-xs text-[#666666] dark:text-[#929292] tabular-nums">
                  Total size: {formatBytes(incomingManifest.totalBytes)}
                </p>
              </div>
              {sasCode && (
                <div className="rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#101010] px-3 py-2 text-right">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                    Verify SAS Code
                  </span>
                  <span className="font-mono text-base font-semibold tracking-widest text-[#111111] dark:text-[#F5F5F5] tabular-nums">
                    {formatSas(sasCode)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
              {incomingManifest.files.map((f) => (
                <FileCard
                  key={f.id}
                  name={f.name}
                  relativePath={f.relativePath}
                  size={f.size}
                  status="queued"
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <Button variant="outline" onClick={rejectIncomingTransfer}>
                Decline
              </Button>
              <Button variant="primary" onClick={acceptIncomingTransfer}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Verify & Accept Files
              </Button>
            </div>
          </div>
        </div>
      )}

      {state === 'AWAITING_ACCEPTANCE' && role === 'sender' && (
        <div className="mt-5 space-y-4">
          <LoadingState
            label={`Waiting for ${remotePeer?.deviceName || 'receiver'} to accept`}
            detail="Explicit receiver consent is required before any file bytes leave your device."
          />
          {sasCode && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#101010] px-4 py-3">
              <div>
                <p className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Short Authentication String (SAS)
                </p>
                <p className="text-xs text-[#666666] dark:text-[#929292]">
                  Confirm this 6-digit code matches the receiving screen.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold tracking-widest text-[#111111] dark:text-[#F5F5F5] tabular-nums">
                  {formatSas(sasCode)}
                </span>
                <Button
                  size="sm"
                  variant={sasConfirmed ? 'secondary' : 'outline'}
                  onClick={() => setSasConfirmed(!sasConfirmed)}
                >
                  {sasConfirmed ? 'Confirmed' : 'Confirm Match'}
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={cancelTransfer}>
              Cancel Request
            </Button>
          </div>
        </div>
      )}

      {isNegotiating && (
        <div className="mt-5 space-y-4">
          <LoadingState
            label={
              state === 'CREATING_SESSION'
                ? 'Creating encrypted pairing session'
                : state === 'AUTHENTICATING'
                  ? 'Deriving ephemeral ECDH P-256 session keys'
                  : 'Establishing peer-to-peer data channel'
            }
            detail={
              remotePeer
                ? `Connected peer: ${remotePeer.deviceName} (${remotePeer.deviceType})`
                : 'Signaling metadata only — zero file bytes pass through signaling.'
            }
          />
          {state === 'CONNECTING' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={switchToRelayFallback}>
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Switch to Encrypted Relay Now
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelTransfer}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {state === 'WAITING_FOR_PEER' && pairingCode && (
        <div className="mt-5 space-y-5">
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] p-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666] dark:text-[#929292]">
              {role === 'sender'
                ? `Ready to send ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'} (${formatBytes(totalSelectedBytes)})`
                : 'Ready to receive files'}
            </p>
            <p className="mt-3 font-mono text-4xl font-semibold tracking-[0.26em] text-[#111111] dark:text-[#F5F5F5] tabular-nums">
              {pairingCode}
            </p>
            <p className="mt-2 font-mono text-xs text-[#666666] dark:text-[#929292] tabular-nums">
              {expiresInSec !== null
                ? `Session expires in ${Math.floor(expiresInSec / 60)}m ${expiresInSec % 60}s`
                : 'Active for 10 minutes'}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#22C55E]" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy Code
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyShareLink}>
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#22C55E]" aria-hidden="true" />
                    Link Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                Show QR Code
              </Button>
              <Button variant="ghost" size="sm" onClick={resetWorkspace}>
                Cancel Session
              </Button>
            </div>
          </div>

          <QRCodeDialog open={qrOpen} onClose={() => setQrOpen(false)} pairingCode={pairingCode} />
        </div>
      )}

      {isRunningOrFinished && (
        <div className="mt-5 space-y-4">
          <TransferCard
            role={role || 'sender'}
            peerName={remotePeer?.deviceName || 'Peer'}
            state={state}
            metrics={metrics}
            fileCount={fileProgress.length || selectedFiles.length}
            onPause={pauseTransfer}
            onResume={resumeTransfer}
            onCancel={cancelTransfer}
          />

          <TransferQueue items={fileProgress} />

          {(state === 'COMPLETED' || state === 'CANCELLED') && (
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={resetWorkspace}>
                Start Another Transfer
              </Button>
            </div>
          )}
        </div>
      )}

      {(state === 'IDLE' || state === 'SELECTING_FILES') && (
        <div className="mt-5 space-y-5">
          <Tabs
            activeTab={modeTab}
            onChange={(tab) => setModeTab(tab)}
            tabs={[
              {
                id: 'send',
                label: 'Send Files',
                count: selectedFiles.length || undefined,
                icon: <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />,
              },
              {
                id: 'receive',
                label: 'Receive / Join',
                icon: <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />,
              },
            ]}
          />

          <AnimatePresence mode="wait">
            {modeTab === 'send' ? (
              <motion.div
                key="tab-send"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'rounded-lg border-2 border-dashed p-6 text-center transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#111111] dark:focus:ring-[#F5F5F5]',
                    dragging
                      ? 'border-[#111111] dark:border-[#F5F5F5] bg-[#F1F1F1] dark:bg-[#151515] scale-[1.01]'
                      : 'border-[#D4D4D4] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#0D0D0D] hover:border-[#A3A3A3] dark:hover:border-[#404040]'
                  )}
                >
                  <motion.div
                    animate={dragging ? { y: -3, scale: 1.06 } : { y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5]"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  </motion.div>
                <p className="mt-3 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                  {remotePeer && role === 'sender'
                    ? `Paired with ${remotePeer.deviceName} — click or drop files to send`
                    : 'Click to select or drop files and folders here'}
                </p>
                <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
                  Files remain local in memory until your peer verifies the SAS code and accepts.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = '';
                    if (files.length > 0) addFiles(files);
                  }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                  className="sr-only"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = '';
                    if (files.length > 0) addFiles(files);
                  }}
                />

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Select Files
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      folderInputRef.current?.click();
                    }}
                  >
                    <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Select Folder
                  </Button>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#666666] dark:text-[#929292] tabular-nums">
                      {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} ·{' '}
                      {formatBytes(totalSelectedBytes)}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectedFiles}
                      className="text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] cursor-pointer"
                    >
                      Clear staged
                    </button>
                  </div>

                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    <AnimatePresence initial={false}>
                      {selectedFiles.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <FileCard
                            name={item.name}
                            relativePath={item.relativePath}
                            size={item.size}
                            status="staged"
                            onRemove={() => removeSelectedFile(item.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {remotePeer && role === 'sender' ? (
                    <Button variant="primary" className="w-full" onClick={sendManifestWhenReady}>
                      Send Files to {remotePeer.deviceName}
                    </Button>
                  ) : (
                    <Button variant="primary" className="w-full" onClick={startSendSession}>
                      Create Pairing Session
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tab-receive"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  joinSessionByCode(joinCode);
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
              >
                <Input
                  label="Enter 6-character pairing code"
                  placeholder="A4K9P2"
                  maxLength={6}
                  mono
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <Button type="submit" variant="primary" className="shrink-0">
                  Join Session
                </Button>
              </form>

              <div className="flex items-center justify-between border-t border-[#E5E5E5] dark:border-[#252525] pt-4">
                <div>
                  <p className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                    Or open a receive room
                  </p>
                  <p className="text-xs text-[#666666] dark:text-[#929292]">
                    Generate a code for a sender to push files to this device.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={startReceiveSession}>
                  Wait to Receive
                </Button>
              </div>

              <div className="border-t border-[#E5E5E5] dark:border-[#252525] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                    Discoverable Peers
                  </span>
                  <button
                    type="button"
                    onClick={refreshDiscovery}
                    className="inline-flex items-center gap-1 text-xs text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Refresh
                  </button>
                </div>

                {discoverableSessions.length === 0 ? (
                  <p className="mt-2 text-xs text-[#8A8A8A] dark:text-[#626262]">
                    No active discoverable rooms right now. Enter a pairing code above or click
                    Refresh.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-2">
                    {discoverableSessions.map((sess) => (
                      <div
                        key={sess.pairingCode}
                        className="flex items-center justify-between gap-3 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#141414] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                            {sess.deviceName}
                          </p>
                          <p className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
                            {sess.deviceType} · {sess.mode === 'send' ? 'Sending' : 'Receiving'} ·{' '}
                            {sess.pairingCode}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => joinSessionByCode(sess.pairingCode)}
                        >
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
