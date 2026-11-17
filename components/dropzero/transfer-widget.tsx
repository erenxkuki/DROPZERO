'use client';

import React, { useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  FolderUp,
  Info,
  QrCode,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTransfer } from '@/lib/dropzero/transfer-context';
import { formatBytes, formatSas } from '@/lib/dropzero/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { NetworkIndicator, StatusIndicator } from '@/components/ui/indicators';
import { FileCard } from './file-card';
import { TransferCard, TransferQueue } from './transfer-card';
import { QRCodeDialog } from './qr-code-dialog';
import { cn } from '@/lib/utils';

export function TransferWidget({
  initialPairCode,
  compact = false,
}: {
  initialPairCode?: string;
  compact?: boolean;
}) {
  const {
    state,
    role,
    error,
    settings,
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
    signalingConnected,
    startSendSession,
    startReceiveSession,
    joinSessionByCode,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [joinCode, setJoinCode] = useState(() =>
    initialPairCode && /^[A-Za-z0-9]{6}$/.test(initialPairCode)
      ? initialPairCode.toUpperCase()
      : ''
  );
  const [qrOpen, setQrOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const pairingUrl =
    typeof window !== 'undefined' && pairingCode
      ? `${window.location.origin}/transfer?pair=${pairingCode}`
      : '';

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer) {
      await addDroppedItems(e.dataTransfer);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await joinSessionByCode(joinCode);
  };

  const isSessionActive =
    state !== 'IDLE' && state !== 'SELECTING_FILES';

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5 sm:p-6">
      {/* Top workspace status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5] dark:border-[#252525]">
        <div className="flex flex-wrap items-center gap-4">
          <StatusIndicator state={state} />
          <NetworkIndicator
            transport={metrics.transport}
            signalingConnected={signalingConnected}
          />
        </div>
        {isSessionActive && (
          <Button size="sm" variant="ghost" onClick={resetWorkspace}>
            New session
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <ErrorState
          code={error.code}
          title="Transfer interrupted"
          description={error.message}
          action={
            <Button size="sm" variant="secondary" onClick={resetWorkspace}>
              Return to workspace
            </Button>
          }
        />
      )}

      {/* Stage 1: Idle / File Selection + Receive Code Entry */}
      {!isSessionActive && (
        <div className="flex flex-col gap-5">
          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-expect-error webkitdirectory is standard in Chromium/Firefox/Safari browsers
            webkitdirectory=""
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Drag-and-drop dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center transition-colors duration-150',
              compact ? 'py-10' : 'py-14',
              isDragging
                ? 'border-[#111111] dark:border-[#F5F5F5] bg-[#F1F1F1] dark:bg-[#181818]'
                : 'border-[#D4D4D4] dark:border-[#303030] bg-[#FAFAFA] dark:bg-[#0B0B0B]'
            )}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#151515] text-[#111111] dark:text-[#F5F5F5]">
              <Upload className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
            </div>
            <p className="text-base font-medium text-[#111111] dark:text-[#F5F5F5]">
              Drop your files here
            </p>
            <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
              or browse your device — selected files stay local until you start a peer session
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Select files</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Select folder</span>
              </Button>
            </div>
          </div>

          {/* Staged file listing */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#111111] dark:text-[#F5F5F5]">
                  <span className="font-medium">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} ready
                  </span>
                  <span aria-hidden="true" className="text-[#929292]">·</span>
                  <span className="font-mono tabular-nums text-[#666666] dark:text-[#929292]">
                    {formatBytes(totalSelectedBytes)} total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFiles}
                  className="inline-flex items-center gap-1 text-xs text-[#666666] dark:text-[#929292] hover:text-[#DC2626] transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear all</span>
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5">
                {selectedFiles.map((item) => (
                  <FileCard
                    key={item.id}
                    name={item.name}
                    relativePath={item.relativePath}
                    size={item.size}
                    status="staged"
                    onRemove={() => removeSelectedFile(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Primary connection actions: Send files / Receive files */}
          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            <div className="flex flex-col justify-between gap-3 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0D0D0D] p-4">
              <div>
                <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Send files
                </h3>
                <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
                  Create a pairing session for your staged files and share the QR or 6-character code.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={selectedFiles.length === 0}
                onClick={startSendSession}
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                <span>
                  Send files{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}
                </span>
              </Button>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0D0D0D] p-4">
              <div>
                <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Receive files
                </h3>
                <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
                  Join an active sender using their 6-character code, or open a receiving session.
                </p>
              </div>
              <form onSubmit={handleJoinSubmit} className="flex items-center gap-2">
                <Input
                  aria-label="6-character pairing code"
                  placeholder="Enter code (e.g. K7M9P2)"
                  value={joinCode}
                  maxLength={6}
                  mono
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <Button type="submit" variant="secondary" disabled={joinCode.trim().length !== 6}>
                  Join
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={startReceiveSession}
                  title="Create a receiving session with a QR code"
                >
                  <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Receive</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Browser vs Native honesty note */}
          <div className="flex items-start gap-2.5 text-xs text-[#666666] dark:text-[#929292] pt-1">
            <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Browser sessions stream directly over WebRTC DataChannels with BLAKE3 verification and switch to an AES-GCM encrypted WebSocket relay if strict NAT blocks direct ICE. For multi-gigabyte disk-to-disk streaming and native QUIC, use the{' '}
              <a href="/download" className="underline text-[#111111] dark:text-[#F5F5F5]">
                DROPZERO desktop core
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Stage 2: Waiting for Peer / Pairing Code & QR */}
      {(state === 'CREATING_SESSION' || state === 'WAITING_FOR_PEER') && (
        <div className="flex flex-col items-center justify-center gap-5 py-6 text-center">
          <div>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              {role === 'sender'
                ? 'Share this pairing code with the receiving device'
                : 'Share this pairing code with the sending device'}
            </p>
            <p className="mt-2 font-mono text-3xl sm:text-4xl font-semibold tracking-[0.25em] text-[#111111] dark:text-[#F5F5F5]">
              {pairingCode || '------'}
            </p>
            {pairingExpiresAt && (
              <p className="mt-1.5 text-xs text-[#666666] dark:text-[#929292]">
                Session expires at{' '}
                {new Date(pairingExpiresAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!pairingCode}
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              <span>Show QR code</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!pairingCode}
              onClick={handleCopyCode}
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy code</span>
                </>
              )}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={cancelTransfer}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Stage 3: Authenticating / Connecting */}
      {(state === 'PEER_DETECTED' || state === 'AUTHENTICATING' || state === 'CONNECTING') && (
        <div className="flex flex-col gap-4 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0D0D0D] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                {remotePeer ? `Connecting to ${remotePeer.deviceName}` : 'Negotiating peer connection'}
              </h3>
              <p className="mt-0.5 text-xs text-[#666666] dark:text-[#929292]">
                Deriving ephemeral ECDH keys and testing direct WebRTC ICE candidates.
              </p>
            </div>
            {sasCode && (
              <div className="text-right">
                <span className="block text-[11px] text-[#666666] dark:text-[#929292]">
                  SAS verification
                </span>
                <span className="font-mono text-base font-semibold tracking-wider text-[#111111] dark:text-[#F5F5F5]">
                  {formatSas(sasCode)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {settings.preferredTransport !== 'webrtc-only' && (
              <Button size="sm" variant="secondary" onClick={switchToRelayFallback}>
                Use encrypted relay now
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={cancelTransfer}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Stage 4: Explicit Acceptance (Sender waits; Receiver explicitly accepts or rejects) */}
      {state === 'AWAITING_ACCEPTANCE' && (
        <div className="flex flex-col gap-4 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0D0D0D] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
                {role === 'receiver'
                  ? `Incoming transfer from ${remotePeer?.deviceName || 'Peer'}`
                  : `Waiting for ${remotePeer?.deviceName || 'Receiver'} to accept`}
              </h3>
              <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
                {role === 'receiver'
                  ? 'Confirm that the 6-digit verification code matches the sender before accepting.'
                  : 'The receiving device must explicitly approve these files before data moves.'}
              </p>
            </div>

            {sasCode && (
              <div className="rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#151515] px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#666666] dark:text-[#929292]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Verification code</span>
                </div>
                <p className="mt-0.5 font-mono text-lg font-semibold tracking-widest text-[#111111] dark:text-[#F5F5F5]">
                  {formatSas(sasCode)}
                </p>
              </div>
            )}
          </div>

          {incomingManifest && role === 'receiver' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#666666] dark:text-[#929292]">
                <span>
                  {incomingManifest.files.length}{' '}
                  {incomingManifest.files.length === 1 ? 'file' : 'files'}
                </span>
                <span className="font-mono tabular-nums">
                  {formatBytes(incomingManifest.totalBytes)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
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
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {role === 'receiver' ? (
              <>
                <Button variant="primary" onClick={acceptIncomingTransfer}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Accept &amp; receive</span>
                </Button>
                <Button variant="outline" onClick={rejectIncomingTransfer}>
                  Reject
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={cancelTransfer}>
                Cancel session
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stage 5: Active / Completed / Paused / Verifying Transfer */}
      {(state === 'TRANSFERRING' ||
        state === 'PAUSED' ||
        state === 'VERIFYING' ||
        state === 'COMPLETED' ||
        state === 'CANCELLED') && (
        <div className="flex flex-col gap-4">
          <TransferCard
            state={state}
            role={role}
            peerName={remotePeer?.deviceName}
            metrics={metrics}
            onPause={pauseTransfer}
            onResume={resumeTransfer}
            onCancel={cancelTransfer}
            onRetry={resetWorkspace}
          />
          <TransferQueue
            files={fileProgress}
            maxConcurrent={settings.maxConcurrentFiles}
          />
          {(state === 'COMPLETED' || state === 'CANCELLED') && (
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] dark:border-[#252525]">
              <p className="text-xs text-[#666666] dark:text-[#929292]">
                {state === 'COMPLETED'
                  ? 'All chunks verified against BLAKE3 digests. Received files require your explicit Save click.'
                  : 'Transfer cancelled and session keys discarded.'}
              </p>
              <Button size="sm" variant="secondary" onClick={resetWorkspace}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}

      {pairingCode && (
        <QRCodeDialog
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          pairingCode={pairingCode}
          pairingUrl={pairingUrl}
          expiresAt={pairingExpiresAt}
        />
      )}
    </div>
  );
}
