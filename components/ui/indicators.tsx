'use client';

import React from 'react';
import { Activity, Globe, Lock, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { TransferState, TransportKind } from '@/lib/dropzero/types';
import { formatSpeed } from '@/lib/dropzero/format';
import { cn } from '@/lib/utils';

const STATE_LABELS: Record<TransferState, string> = {
  IDLE: 'Idle',
  SELECTING_FILES: 'Files staged locally',
  CREATING_SESSION: 'Creating session',
  WAITING_FOR_PEER: 'Waiting for peer',
  PEER_DETECTED: 'Peer detected',
  AUTHENTICATING: 'Authenticating peer',
  AWAITING_ACCEPTANCE: 'Awaiting acceptance',
  CONNECTING: 'Negotiating transport',
  TRANSFERRING: 'Transferring',
  PAUSED: 'Paused',
  VERIFYING: 'Verifying BLAKE3',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  RECOVERING: 'Recovering session',
};

export function StatusIndicator({ state }: { state: TransferState }) {
  const tone =
    state === 'COMPLETED'
      ? 'text-[#16A34A] dark:text-[#22C55E]'
      : state === 'FAILED'
      ? 'text-[#DC2626] dark:text-[#EF4444]'
      : state === 'PAUSED' || state === 'AWAITING_ACCEPTANCE'
      ? 'text-[#D97706]'
      : 'text-[#111111] dark:text-[#F5F5F5]';

  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium">
      <Activity className={cn('h-3.5 w-3.5 shrink-0', tone)} aria-hidden="true" />
      <span className={tone}>{STATE_LABELS[state]}</span>
    </div>
  );
}

export function NetworkIndicator({
  transport,
  signalingConnected,
}: {
  transport: TransportKind;
  signalingConnected: boolean;
}) {
  const label =
    transport === 'webrtc-direct-lan'
      ? 'Direct LAN (WebRTC host)'
      : transport === 'webrtc-direct-stun'
      ? 'Direct P2P (WebRTC STUN)'
      : transport === 'webrtc-turn-relay'
      ? 'Relayed (TURN)'
      : transport === 'ws-encrypted-relay'
      ? 'E2E Encrypted Relay (WS)'
      : signalingConnected
      ? 'Signaling connected'
      : 'Disconnected';

  const Icon =
    transport === 'ws-encrypted-relay' || transport === 'webrtc-turn-relay'
      ? Globe
      : transport === 'unavailable' && !signalingConnected
      ? WifiOff
      : Wifi;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-[#666666] dark:text-[#929292]">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {transport !== 'unavailable' && (
        <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-[#22C55E]">
          <Lock className="h-3 w-3" aria-hidden="true" />
          <span>E2E</span>
        </span>
      )}
    </div>
  );
}

export function SpeedIndicator({
  currentBps,
  averageBps,
  compact = false,
}: {
  currentBps: number | null;
  averageBps: number | null;
  compact?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 font-mono tabular-nums">
      <span className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
        {formatSpeed(currentBps)}
      </span>
      {!compact && averageBps !== null && averageBps > 0 && (
        <span className="text-xs text-[#666666] dark:text-[#929292]">
          avg {formatSpeed(averageBps)}
        </span>
      )}
    </div>
  );
}

export function EncryptionBadge({ sasVerified }: { sasVerified: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#929292]">
      <ShieldCheck
        className={cn(
          'h-3.5 w-3.5',
          sasVerified ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#929292]'
        )}
        aria-hidden="true"
      />
      <span>{sasVerified ? 'Peer SAS verified' : 'ECDH P-256 + BLAKE3'}</span>
    </div>
  );
}
