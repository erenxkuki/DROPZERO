export type TransferState =
  | 'IDLE'
  | 'SELECTING_FILES'
  | 'CREATING_SESSION'
  | 'WAITING_FOR_PEER'
  | 'PEER_DETECTED'
  | 'AUTHENTICATING'
  | 'AWAITING_ACCEPTANCE'
  | 'CONNECTING'
  | 'TRANSFERRING'
  | 'PAUSED'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RECOVERING';

export const VALID_TRANSITIONS: Record<TransferState, TransferState[]> = {
  IDLE: ['SELECTING_FILES', 'CREATING_SESSION', 'CONNECTING'],
  SELECTING_FILES: ['IDLE', 'CREATING_SESSION', 'WAITING_FOR_PEER', 'CONNECTING'],
  CREATING_SESSION: ['WAITING_FOR_PEER', 'FAILED', 'CANCELLED', 'IDLE'],
  WAITING_FOR_PEER: ['PEER_DETECTED', 'CANCELLED', 'FAILED', 'IDLE'],
  PEER_DETECTED: ['AUTHENTICATING', 'FAILED', 'CANCELLED'],
  AUTHENTICATING: ['AWAITING_ACCEPTANCE', 'CONNECTING', 'FAILED', 'CANCELLED'],
  AWAITING_ACCEPTANCE: ['CONNECTING', 'TRANSFERRING', 'CANCELLED', 'FAILED'],
  CONNECTING: ['AWAITING_ACCEPTANCE', 'TRANSFERRING', 'RECOVERING', 'FAILED', 'CANCELLED'],
  TRANSFERRING: ['PAUSED', 'VERIFYING', 'RECOVERING', 'FAILED', 'CANCELLED'],
  PAUSED: ['TRANSFERRING', 'RECOVERING', 'CANCELLED', 'FAILED'],
  VERIFYING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: ['IDLE', 'SELECTING_FILES', 'CREATING_SESSION'],
  FAILED: ['IDLE', 'SELECTING_FILES', 'RECOVERING', 'CREATING_SESSION'],
  CANCELLED: ['IDLE', 'SELECTING_FILES', 'CREATING_SESSION'],
  RECOVERING: ['TRANSFERRING', 'VERIFYING', 'FAILED', 'CANCELLED'],
};

export function canTransition(from: TransferState, to: TransferState): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export type DropZeroErrorCode =
  | 'NETWORK_UNAVAILABLE'
  | 'PEER_NOT_FOUND'
  | 'PAIRING_EXPIRED'
  | 'AUTHENTICATION_FAILED'
  | 'TRANSFER_REJECTED'
  | 'FILE_READ_FAILED'
  | 'FILE_WRITE_FAILED'
  | 'INTEGRITY_MISMATCH'
  | 'STORAGE_FULL'
  | 'TRANSPORT_FAILED'
  | 'SESSION_EXPIRED'
  | 'RESUME_UNAVAILABLE'
  | 'UNSUPPORTED_PLATFORM'
  | 'INVALID_STATE_TRANSITION';

export class DropZeroError extends Error {
  readonly code: DropZeroErrorCode;
  readonly recoverable: boolean;

  constructor(code: DropZeroErrorCode, message: string, recoverable = false) {
    super(message);
    this.name = 'DropZeroError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export type TransportKind =
  | 'webrtc-direct-lan'
  | 'webrtc-direct-stun'
  | 'webrtc-turn-relay'
  | 'ws-encrypted-relay'
  | 'unavailable';

export type DevicePlatform = 'Windows PC' | 'Linux PC' | 'macOS' | 'Android' | 'Browser';

export interface LocalDeviceIdentity {
  deviceId: string;
  deviceName: string;
  deviceType: DevicePlatform;
  platform: string;
  capabilities: string[];
}

export interface RemotePeerMetadata {
  peerId: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  publicKeyJwk: JsonWebKey;
  capabilities: string[];
  fingerprint?: string;
}

export interface FileManifestEntry {
  index: number;
  id: string;
  name: string;
  relativePath: string;
  size: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  blake3?: string;
}

export interface TransferManifest {
  protocolVersion: string;
  sessionId: string;
  senderName: string;
  totalBytes: number;
  files: FileManifestEntry[];
  createdAt: number;
}

export interface FileProgressItem {
  index: number;
  id: string;
  name: string;
  relativePath: string;
  size: number;
  transferredBytes: number;
  totalChunks: number;
  completedChunks: number;
  status: 'queued' | 'transferring' | 'verifying' | 'verified' | 'failed' | 'cancelled';
  blake3Expected?: string;
  blake3Computed?: string;
  downloadUrl?: string;
}

export interface TransferMetrics {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  currentSpeedBps: number | null;
  smoothedSpeedBps: number | null;
  averageSpeedBps: number | null;
  peakSpeedBps: number | null;
  etaSeconds: number | null;
  elapsedMs: number;
  rttMs: number | null;
  activeChunkSize: number;
  transport: TransportKind;
  iceCandidateType: string | null;
  encrypted: boolean;
}

export interface TransferHistoryEntry {
  id: string;
  filename: string;
  fileCount: number;
  direction: 'sent' | 'received';
  totalBytes: number;
  timestamp: number;
  status: 'completed' | 'failed' | 'cancelled';
  deviceName: string;
  deviceType: string;
  durationMs: number;
  transport: TransportKind;
  blake3Root?: string;
  errorCode?: string;
}

export interface RememberedDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  fingerprint: string;
  lastSessionAt: number;
  capabilities: string[];
}

export interface RecoveryCheckpoint {
  transferId: string;
  filename: string;
  totalBytes: number;
  chunkSize: number;
  totalChunks: number;
  completedChunks: number[];
  updatedAt: number;
}

export interface DropZeroSettings {
  deviceName: string;
  language: string;
  maxConcurrentFiles: number;
  preferredTransport: 'auto' | 'webrtc-only' | 'relay-fallback';
  chunkSizeMode: 'adaptive' | '256k' | '1m' | '4m';
  autoResume: boolean;
  requireExplicitAccept: boolean;
  rememberDevices: boolean;
  discoverableOnSignaling: boolean;
  notificationsEnabled: boolean;
  debugLogging: boolean;
}

export const DEFAULT_SETTINGS: DropZeroSettings = {
  deviceName: 'Web Workstation',
  language: 'en-US',
  maxConcurrentFiles: 2,
  preferredTransport: 'auto',
  chunkSizeMode: 'adaptive',
  autoResume: true,
  requireExplicitAccept: true,
  rememberDevices: false,
  discoverableOnSignaling: true,
  notificationsEnabled: false,
  debugLogging: false,
};

export interface DiscoverableSession {
  pairingCode: string;
  mode: 'send' | 'receive';
  deviceName: string;
  deviceType: string;
  platform: string;
  expiresAt: number;
}
