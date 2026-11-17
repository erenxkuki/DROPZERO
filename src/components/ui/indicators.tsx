import React from 'react';
import { Lock, Radio, ShieldCheck, Wifi } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatSpeed } from '@/src/lib/dropzero/format';
import { TransferState, TransportKind } from '@/src/lib/dropzero/types';

export interface StatusIndicatorProps {
  state: TransferState;
  className?: string;
}

const STATE_LABELS: Record<TransferState, string> = {
  IDLE: 'Idle',
  SELECTING_FILES: 'Files staged',
  CREATING_SESSION: 'Creating session',
  WAITING_FOR_PEER: 'Waiting for peer',
  PEER_DETECTED: 'Peer detected',
  AUTHENTICATING: 'Key exchange',
  AWAITING_ACCEPTANCE: 'Awaiting acceptance',
  CONNECTING: 'Negotiating path',
  TRANSFERRING: 'Transferring',
  PAUSED: 'Paused',
  VERIFYING: 'Verifying BLAKE3',
  COMPLETED: 'Verified & complete',
  FAILED: 'Transfer failed',
  CANCELLED: 'Cancelled',
  RECOVERING: 'Recovering session',
};

export function StatusIndicator({ state, className }: StatusIndicatorProps) {
  const dotColor =
    state === 'COMPLETED'
      ? 'bg-[#16A34A] dark:bg-[#22C55E]'
      : state === 'FAILED'
        ? 'bg-[#DC2626] dark:bg-[#EF4444]'
        : state === 'PAUSED' || state === 'RECOVERING' || state === 'AWAITING_ACCEPTANCE'
          ? 'bg-[#D97706]'
          : state === 'TRANSFERRING' || state === 'VERIFYING' || state === 'CONNECTING'
            ? 'bg-[#111111] dark:bg-[#F5F5F5]'
            : 'bg-[#8A8A8A] dark:bg-[#626262]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-medium text-[#111111] dark:text-[#F5F5F5]',
        className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} aria-hidden="true" />
      <span>{STATE_LABELS[state]}</span>
    </span>
  );
}

export interface NetworkIndicatorProps {
  transport: TransportKind;
  signalingConnected: boolean;
  className?: string;
}

const TRANSPORT_LABELS: Record<TransportKind, string> = {
  'webrtc-direct-lan': 'Direct LAN P2P',
  'webrtc-direct-stun': 'Direct P2P (STUN)',
  'webrtc-turn-relay': 'TURN Relay (E2E)',
  'ws-encrypted-relay': 'Encrypted Relay (E2E)',
  unavailable: 'No active tunnel',
};

export function NetworkIndicator({
  transport,
  signalingConnected,
  className,
}: NetworkIndicatorProps) {
  const Icon = transport === 'ws-encrypted-relay' ? Radio : Wifi;
  const label =
    transport === 'unavailable'
      ? signalingConnected
        ? 'Signaling connected'
        : 'Offline / Standby'
      : TRANSPORT_LABELS[transport];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#929292]',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export interface SpeedIndicatorProps {
  speedBps: number | null;
  rttMs?: number | null;
  className?: string;
}

export function SpeedIndicator({ speedBps, rttMs, className }: SpeedIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs tabular-nums text-[#111111] dark:text-[#F5F5F5]',
        className
      )}
    >
      <span>{formatSpeed(speedBps)}</span>
      {typeof rttMs === 'number' && (
        <span className="text-[#666666] dark:text-[#929292]">· {rttMs} ms RTT</span>
      )}
    </span>
  );
}

export function EncryptionBadge({
  verified,
  className,
}: {
  verified?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        verified
          ? 'text-[#16A34A] dark:text-[#22C55E]'
          : 'text-[#666666] dark:text-[#929292]',
        className
      )}
    >
      {verified ? (
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{verified ? 'E2E Verified (ECDH + AES-GCM)' : 'E2E Encrypted'}</span>
    </span>
  );
}
