'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  canTransition,
  DEFAULT_SETTINGS,
  DiscoverableSession,
  DropZeroError,
  DropZeroErrorCode,
  DropZeroSettings,
  FileManifestEntry,
  FileProgressItem,
  LocalDeviceIdentity,
  RememberedDevice,
  RemotePeerMetadata,
  TransferHistoryEntry,
  TransferManifest,
  TransferMetrics,
  TransferState,
  TransportKind,
} from './types';
import {
  decryptRelayFrame,
  deriveSessionSecurity,
  encryptRelayFrame,
  EphemeralIdentity,
  generateEphemeralIdentity,
  generatePairingCode,
  sanitizeFilename,
  sanitizeRelativePath,
  uint8ToBase64,
  base64ToUint8,
} from './security';
import {
  bytesEqual,
  hashBytesBlake3,
  StreamingFileHasher,
} from './integrity';
import {
  decodeChunkFrame,
  encodeChunkFrame,
  PROTOCOL_VERSION,
  selectInitialChunkSize,
} from './protocol';
import {
  addTransferHistory,
  clearRecoveryCheckpoints,
  clearRememberedDevices,
  clearTransferHistory,
  deleteHistoryEntry,
  deleteRecoveryCheckpoint,
  getLocalSettings,
  getOrCreateLocalDeviceIdentity,
  getRememberedDevices,
  getTransferHistory,
  removeRememberedDevice,
  saveLocalSettings,
  saveRecoveryCheckpoint,
  saveRememberedDevice,
} from './storage';

export interface SelectedFileItem {
  id: string;
  file: File;
  name: string;
  relativePath: string;
  size: number;
  mimeType: string;
}

export interface DiagnosticLogEntry {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error';
  event: string;
  detail?: string;
}

interface ActiveMetricsTracker {
  startedAt: number;
  lastSampleAt: number;
  lastBytes: number;
  smoothedBps: number | null;
  peakBps: number | null;
  bytesTransferred: number;
  totalBytes: number;
}

interface TransferContextValue {
  // State & Role
  state: TransferState;
  role: 'sender' | 'receiver' | null;
  error: { code: DropZeroErrorCode; message: string; recoverable: boolean } | null;

  // Identity & Settings
  localDevice: LocalDeviceIdentity;
  settings: DropZeroSettings;
  updateSettings: (partial: Partial<DropZeroSettings>) => Promise<void>;

  // Selected files (Sender)
  selectedFiles: SelectedFileItem[];
  totalSelectedBytes: number;
  addFiles: (files: FileList | File[]) => void;
  addDroppedItems: (dataTransfer: DataTransfer) => Promise<void>;
  removeSelectedFile: (id: string) => void;
  clearSelectedFiles: () => void;

  // Pairing & Session
  sessionId: string | null;
  pairingCode: string | null;
  pairingExpiresAt: number | null;
  remotePeer: RemotePeerMetadata | null;
  sasCode: string | null;
  sasConfirmed: boolean;
  setSasConfirmed: (confirmed: boolean) => void;
  signalingConnected: boolean;
  discoverableSessions: DiscoverableSession[];
  refreshDiscovery: () => void;

  // Actions
  startSendSession: () => Promise<void>;
  startReceiveSession: () => Promise<void>;
  joinSessionByCode: (code: string) => Promise<void>;
  acceptIncomingTransfer: () => Promise<void>;
  rejectIncomingTransfer: () => void;
  pauseTransfer: () => void;
  resumeTransfer: () => void;
  cancelTransfer: () => void;
  resetWorkspace: () => void;
  switchToRelayFallback: () => void;

  // Progress & Files
  incomingManifest: TransferManifest | null;
  fileProgress: FileProgressItem[];
  metrics: TransferMetrics;

  // Persistence
  history: TransferHistoryEntry[];
  rememberedDevices: RememberedDevice[];
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  forgetDevice: (id: string) => Promise<void>;
  clearAllLocalData: () => Promise<void>;

  // Logs
  logs: DiagnosticLogEntry[];
  exportDiagnostics: () => string;
}

const initialMetrics: TransferMetrics = {
  bytesTransferred: 0,
  totalBytes: 0,
  percentage: 0,
  currentSpeedBps: null,
  smoothedSpeedBps: null,
  averageSpeedBps: null,
  peakSpeedBps: null,
  etaSeconds: null,
  elapsedMs: 0,
  rttMs: null,
  activeChunkSize: 256 * 1024,
  transport: 'unavailable',
  iceCandidateType: null,
  encrypted: true,
};

const TransferContext = createContext<TransferContextValue | null>(null);

function getSignalingWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const override = process.env.NEXT_PUBLIC_DROPZERO_SIGNALING_URL;
  if (override && override.trim().length > 0) return override.trim();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/signaling`;
}

function getIceServers(): RTCIceServer[] {
  const stun =
    process.env.NEXT_PUBLIC_DROPZERO_STUN_URL?.trim() || 'stun:stun.l.google.com:19302';
  return [{ urls: stun }, { urls: 'stun:stun1.l.google.com:19302' }];
}

async function readEntryFiles(entry: FileSystemEntry, prefix = ''): Promise<File[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fileEntry.file(
        (file) => {
          const relPath = prefix ? `${prefix}/${file.name}` : file.name;
          try {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: relPath,
              configurable: true,
            });
          } catch {
            // Ignore read-only webkitRelativePath in strict browsers
          }
          resolve([file]);
        },
        () => resolve([])
      );
    });
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries: FileSystemEntry[] = [];
    const readBatch = (): Promise<void> =>
      new Promise((resolve) => {
        reader.readEntries(
          (batch) => {
            if (batch.length === 0) {
              resolve();
            } else {
              entries.push(...batch);
              readBatch().then(resolve);
            }
          },
          () => resolve()
        );
      });
    await readBatch();
    const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    const nested = await Promise.all(entries.map((child) => readEntryFiles(child, nextPrefix)));
    return nested.flat();
  }

  return [];
}

export function TransferProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<TransferState>('IDLE');
  const stateRef = useRef<TransferState>('IDLE');

  const [role, setRole] = useState<'sender' | 'receiver' | null>(null);
  const roleRef = useRef<'sender' | 'receiver' | null>(null);

  const [error, setError] = useState<{
    code: DropZeroErrorCode;
    message: string;
    recoverable: boolean;
  } | null>(null);

  const [settings, setSettings] = useState<DropZeroSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<DropZeroSettings>(DEFAULT_SETTINGS);

  const [localDevice, setLocalDevice] = useState<LocalDeviceIdentity>(() =>
    getOrCreateLocalDeviceIdentity()
  );
  const localDeviceRef = useRef<LocalDeviceIdentity>(localDevice);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const selectedFilesRef = useRef<SelectedFileItem[]>([]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<number | null>(null);
  const [remotePeer, setRemotePeer] = useState<RemotePeerMetadata | null>(null);
  const remotePeerRef = useRef<RemotePeerMetadata | null>(null);

  const [sasCode, setSasCode] = useState<string | null>(null);
  const [sasConfirmed, setSasConfirmed] = useState(false);

  const [signalingConnected, setSignalingConnected] = useState(false);
  const [discoverableSessions, setDiscoverableSessions] = useState<DiscoverableSession[]>([]);

  const [incomingManifest, setIncomingManifest] = useState<TransferManifest | null>(null);
  const incomingManifestRef = useRef<TransferManifest | null>(null);

  const [fileProgress, setFileProgress] = useState<FileProgressItem[]>([]);
  const [metrics, setMetrics] = useState<TransferMetrics>(initialMetrics);

  const [history, setHistory] = useState<TransferHistoryEntry[]>([]);
  const [rememberedDevices, setRememberedDevices] = useState<RememberedDevice[]>([]);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);

  // Mutable engine refs
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);
  const ephemeralRef = useRef<EphemeralIdentity | null>(null);
  const aesKeyRef = useRef<CryptoKey | null>(null);
  const transportModeRef = useRef<TransportKind>('unavailable');
  const relaySeqRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const cancelledRef = useRef<boolean>(false);
  const pauseWaitersRef = useRef<Array<() => void>>([]);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metricsTrackerRef = useRef<ActiveMetricsTracker>({
    startedAt: 0,
    lastSampleAt: 0,
    lastBytes: 0,
    smoothedBps: null,
    peakBps: null,
    bytesTransferred: 0,
    totalBytes: 0,
  });

  // Receiver state buffers per file index
  const recvBuffersRef = useRef<
    Map<
      number,
      {
        chunks: Map<number, Uint8Array>;
        receivedCount: number;
        totalChunks: number;
        receivedBytes: number;
        expectedBlake3?: string;
        mimeType: string;
        filename: string;
      }
    >
  >(new Map());

  const addLog = useCallback(
    (level: DiagnosticLogEntry['level'], event: string, detail?: string) => {
      setLogs((prev) => [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), level, event, detail },
        ...prev.slice(0, 149),
      ]);
    },
    []
  );

  const transitionState = useCallback(
    (next: TransferState) => {
      const current = stateRef.current;
      if (current === next) return true;
      if (!canTransition(current, next)) {
        addLog('warn', 'Blocked invalid state transition', `${current} -> ${next}`);
        return false;
      }
      stateRef.current = next;
      setStateRaw(next);
      addLog('info', `State -> ${next}`);
      return true;
    },
    [addLog]
  );

  const failWith = useCallback(
    (code: DropZeroErrorCode, message: string, recoverable = false) => {
      setError({ code, message, recoverable });
      addLog('error', code, message);
      stateRef.current = 'FAILED';
      setStateRaw('FAILED');
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    },
    [addLog]
  );

  // Load initial settings, history, devices
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loadedSettings, loadedHistory, loadedDevices] = await Promise.all([
        getLocalSettings(),
        getTransferHistory(),
        getRememberedDevices(),
      ]);
      if (!mounted) return;
      setSettings(loadedSettings);
      settingsRef.current = loadedSettings;
      const identity = getOrCreateLocalDeviceIdentity(loadedSettings.deviceName);
      setLocalDevice(identity);
      localDeviceRef.current = identity;
      setHistory(loadedHistory);
      setRememberedDevices(loadedDevices);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<DropZeroSettings>) => {
      const next = { ...settingsRef.current, ...partial };
      settingsRef.current = next;
      setSettings(next);
      await saveLocalSettings(next);
      if (partial.deviceName !== undefined) {
        const updated = getOrCreateLocalDeviceIdentity(partial.deviceName);
        setLocalDevice(updated);
        localDeviceRef.current = updated;
      }
      addLog('info', 'Settings updated');
    },
    [addLog]
  );

  const teardownConnection = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (iceFallbackTimerRef.current) {
      clearTimeout(iceFallbackTimerRef.current);
      iceFallbackTimerRef.current = null;
    }
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {}
      dataChannelRef.current = null;
    }
    if (controlChannelRef.current) {
      try {
        controlChannelRef.current.close();
      } catch {}
      controlChannelRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'session:leave' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setSignalingConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      teardownConnection();
    };
  }, [teardownConnection]);

  // Send control message over WebRTC control channel OR encrypted WebSocket relay
  const sendControlMessage = useCallback(async (payload: Record<string, unknown>) => {
    const dc = controlChannelRef.current;
    if (dc && dc.readyState === 'open' && transportModeRef.current !== 'ws-encrypted-relay') {
      dc.send(JSON.stringify(payload));
      return;
    }
    const ws = wsRef.current;
    const key = aesKeyRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && key) {
      const bytes = new TextEncoder().encode(JSON.stringify({ kind: 'ctrl', body: payload }));
      const enc = await encryptRelayFrame(key, bytes);
      relaySeqRef.current += 1;
      ws.send(
        JSON.stringify({
          type: 'relay:packet',
          seq: relaySeqRef.current,
          iv: enc.iv,
          ciphertext: enc.ciphertext,
        })
      );
    }
  }, []);

  const startMetricsPolling = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    const tracker = metricsTrackerRef.current;
    tracker.startedAt = performance.now();
    tracker.lastSampleAt = tracker.startedAt;
    tracker.lastBytes = 0;
    tracker.smoothedBps = null;
    tracker.peakBps = null;

    statsIntervalRef.current = setInterval(async () => {
      const now = performance.now();
      const dtSec = Math.max((now - tracker.lastSampleAt) / 1000, 0.1);
      const deltaBytes = Math.max(tracker.bytesTransferred - tracker.lastBytes, 0);
      const rawBps = deltaBytes / dtSec;
      tracker.lastSampleAt = now;
      tracker.lastBytes = tracker.bytesTransferred;

      const smoothed =
        tracker.smoothedBps === null
          ? rawBps
          : tracker.smoothedBps * 0.65 + rawBps * 0.35;
      tracker.smoothedBps = smoothed;
      if (rawBps > 0) {
        tracker.peakBps = tracker.peakBps === null ? rawBps : Math.max(tracker.peakBps, rawBps);
      }

      const elapsedMs = now - tracker.startedAt;
      const avgBps = elapsedMs > 200 ? (tracker.bytesTransferred / elapsedMs) * 1000 : null;
      const remaining = Math.max(tracker.totalBytes - tracker.bytesTransferred, 0);
      const etaSec = smoothed > 64 ? remaining / smoothed : null;

      let rttMs: number | null = null;
      let candidateType: string | null = null;
      let resolvedTransport = transportModeRef.current;

      if (pcRef.current && resolvedTransport !== 'ws-encrypted-relay') {
        try {
          const stats = await pcRef.current.getStats();
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (typeof report.currentRoundTripTime === 'number') {
                rttMs = Math.round(report.currentRoundTripTime * 1000);
              }
              const remoteId = report.remoteCandidateId;
              const remoteCand = stats.get(remoteId);
              if (remoteCand && typeof remoteCand.candidateType === 'string') {
                candidateType = remoteCand.candidateType;
                if (candidateType === 'host') resolvedTransport = 'webrtc-direct-lan';
                else if (candidateType === 'srflx' || candidateType === 'prflx')
                  resolvedTransport = 'webrtc-direct-stun';
                else if (candidateType === 'relay') resolvedTransport = 'webrtc-turn-relay';
              }
            }
          });
        } catch {
          // Ignore stats error on closed connection
        }
      }

      transportModeRef.current = resolvedTransport;

      setMetrics((prev) => ({
        ...prev,
        bytesTransferred: tracker.bytesTransferred,
        totalBytes: tracker.totalBytes,
        percentage:
          tracker.totalBytes > 0
            ? Math.min(100, (tracker.bytesTransferred / tracker.totalBytes) * 100)
            : 0,
        currentSpeedBps: rawBps > 0 ? rawBps : prev.currentSpeedBps,
        smoothedSpeedBps: smoothed > 0 ? smoothed : prev.smoothedSpeedBps,
        averageSpeedBps: avgBps,
        peakSpeedBps: tracker.peakBps,
        etaSeconds: etaSec,
        elapsedMs,
        rttMs,
        transport: resolvedTransport,
        iceCandidateType: candidateType,
      }));
    }, 500);
  }, []);

  // File selection helpers
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const items: SelectedFileItem[] = list.map((file, idx) => {
        const rawRel =
          (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: sanitizeFilename(file.name),
          relativePath: sanitizeRelativePath(rawRel),
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
        };
      });

      setSelectedFiles((prev) => {
        const merged = [...prev, ...items];
        selectedFilesRef.current = merged;
        return merged;
      });
      setError(null);
      if (stateRef.current === 'IDLE' || stateRef.current === 'COMPLETED' || stateRef.current === 'CANCELLED') {
        transitionState('SELECTING_FILES');
      }
      addLog('info', `Added ${items.length} local file(s)`);
    },
    [addLog, transitionState]
  );

  const addDroppedItems = useCallback(
    async (dataTransfer: DataTransfer) => {
      const items = Array.from(dataTransfer.items || []);
      const extracted: File[] = [];

      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          const files = await readEntryFiles(entry);
          extracted.push(...files);
        } else if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) extracted.push(f);
        }
      }

      if (extracted.length === 0 && dataTransfer.files.length > 0) {
        addFiles(dataTransfer.files);
      } else if (extracted.length > 0) {
        addFiles(extracted);
      }
    },
    [addFiles]
  );

  const removeSelectedFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((item) => item.id !== id);
      selectedFilesRef.current = next;
      if (next.length === 0 && stateRef.current === 'SELECTING_FILES') {
        stateRef.current = 'IDLE';
        setStateRaw('IDLE');
      }
      return next;
    });
  }, []);

  const clearSelectedFiles = useCallback(() => {
    selectedFilesRef.current = [];
    setSelectedFiles([]);
    if (stateRef.current === 'SELECTING_FILES') {
      transitionState('IDLE');
    }
  }, [transitionState]);

  // Execute sender streaming pipeline
  const runSenderPipeline = useCallback(
    async (manifest: TransferManifest) => {
      const files = selectedFilesRef.current;
      if (files.length === 0) return;

      cancelledRef.current = false;
      pausedRef.current = false;
      transitionState('TRANSFERRING');
      metricsTrackerRef.current.totalBytes = manifest.totalBytes;
      metricsTrackerRef.current.bytesTransferred = 0;
      startMetricsPolling();

      const startWall = Date.now();
      let lastFileHash = '';

      try {
        for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
          if (cancelledRef.current) throw new DropZeroError('TRANSFER_REJECTED', 'Transfer cancelled by user');

          const item = files[fileIdx];
          const manifestEntry = manifest.files[fileIdx];
          const chunkSize = manifestEntry.chunkSize;
          const totalChunks = manifestEntry.totalChunks;

          setFileProgress((prev) =>
            prev.map((fp) => (fp.index === fileIdx ? { ...fp, status: 'transferring' } : fp))
          );

          const fileHasher = new StreamingFileHasher();
          await fileHasher.init();

          for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
            if (cancelledRef.current) {
              throw new DropZeroError('TRANSFER_REJECTED', 'Transfer cancelled by user');
            }

            if (pausedRef.current) {
              await new Promise<void>((resolve) => {
                pauseWaitersRef.current.push(resolve);
              });
              if (cancelledRef.current) {
                throw new DropZeroError('TRANSFER_REJECTED', 'Transfer cancelled by user');
              }
            }

            const start = chunkIdx * chunkSize;
            const end = Math.min(start + chunkSize, item.size);
            const sliceBuffer = await item.file.slice(start, end).arrayBuffer();
            const chunkBytes = new Uint8Array(sliceBuffer);

            fileHasher.update(chunkBytes);
            const chunkDigest = await hashBytesBlake3(chunkBytes);
            const frame = encodeChunkFrame(fileIdx, chunkIdx, chunkDigest, chunkBytes);

            if (transportModeRef.current === 'ws-encrypted-relay') {
              const ws = wsRef.current;
              const key = aesKeyRef.current;
              if (!ws || ws.readyState !== WebSocket.OPEN || !key) {
                throw new DropZeroError('TRANSPORT_FAILED', 'Relay connection unavailable', true);
              }
              const payloadWrapper = new Uint8Array(1 + frame.length);
              payloadWrapper[0] = 0x01; // binary chunk tag
              payloadWrapper.set(frame, 1);
              const enc = await encryptRelayFrame(key, payloadWrapper);
              relaySeqRef.current += 1;
              ws.send(
                JSON.stringify({
                  type: 'relay:packet',
                  seq: relaySeqRef.current,
                  iv: enc.iv,
                  ciphertext: enc.ciphertext,
                })
              );
              // Yield to event loop so WS flush remains smooth
              if (ws.bufferedAmount > 1024 * 1024) {
                await new Promise((r) => setTimeout(r, 20));
              }
            } else {
              const dc = dataChannelRef.current;
              if (!dc || dc.readyState !== 'open') {
                throw new DropZeroError('TRANSPORT_FAILED', 'Direct WebRTC data channel closed', true);
              }
              // Real backpressure using bufferedAmountLowThreshold
              if (dc.bufferedAmount > 1536 * 1024) {
                await new Promise<void>((resolve, reject) => {
                  const onLow = () => {
                    dc.removeEventListener('bufferedamountlow', onLow);
                    dc.removeEventListener('close', onClose);
                    resolve();
                  };
                  const onClose = () => {
                    dc.removeEventListener('bufferedamountlow', onLow);
                    dc.removeEventListener('close', onClose);
                    reject(new DropZeroError('TRANSPORT_FAILED', 'Data channel closed during backpressure wait', true));
                  };
                  dc.bufferedAmountLowThreshold = 512 * 1024;
                  dc.addEventListener('bufferedamountlow', onLow);
                  dc.addEventListener('close', onClose);
                });
              }
              dc.send(frame as unknown as ArrayBuffer);
            }

            metricsTrackerRef.current.bytesTransferred += chunkBytes.length;

            setFileProgress((prev) =>
              prev.map((fp) =>
                fp.index === fileIdx
                  ? {
                      ...fp,
                      completedChunks: chunkIdx + 1,
                      transferredBytes: Math.min(item.size, (chunkIdx + 1) * chunkSize),
                    }
                  : fp
              )
            );
          }

          // Handle zero-byte files cleanly
          if (totalChunks === 0) {
            setFileProgress((prev) =>
              prev.map((fp) =>
                fp.index === fileIdx
                  ? { ...fp, completedChunks: 0, transferredBytes: 0 }
                  : fp
              )
            );
          }

          const fullBlake3 = fileHasher.digestHex();
          lastFileHash = fullBlake3;

          setFileProgress((prev) =>
            prev.map((fp) =>
              fp.index === fileIdx
                ? { ...fp, status: 'verifying', blake3Expected: fullBlake3 }
                : fp
            )
          );

          await sendControlMessage({
            type: 'FILE_COMPLETE',
            fileIndex: fileIdx,
            blake3: fullBlake3,
          });
        }

        transitionState('VERIFYING');
        addLog('info', 'All files streamed, waiting for receiver BLAKE3 verification');
      } catch (err) {
        if (err instanceof DropZeroError && cancelledRef.current) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Streaming failed';
        const code = err instanceof DropZeroError ? err.code : 'TRANSPORT_FAILED';
        failWith(code, message, true);

        const entry: TransferHistoryEntry = {
          id: manifest.sessionId,
          filename: files.length === 1 ? files[0].name : `${files[0].name} (+${files.length - 1})`,
          fileCount: files.length,
          direction: 'sent',
          totalBytes: manifest.totalBytes,
          timestamp: Date.now(),
          status: 'failed',
          deviceName: remotePeerRef.current?.deviceName || 'Peer',
          deviceType: remotePeerRef.current?.deviceType || 'Browser',
          durationMs: Date.now() - startWall,
          transport: transportModeRef.current,
          blake3Root: lastFileHash || undefined,
          errorCode: code,
        };
        await addTransferHistory(entry);
        setHistory(await getTransferHistory());
      }
    },
    [addLog, failWith, sendControlMessage, startMetricsPolling, transitionState]
  );

  // Handle incoming binary chunk on receiver
  const handleIncomingBinaryChunk = useCallback(
    async (rawBytes: Uint8Array) => {
      try {
        const frame = decodeChunkFrame(rawBytes);
        const fileState = recvBuffersRef.current.get(frame.fileIndex);
        if (!fileState) return;

        const computed = await hashBytesBlake3(frame.payload);
        if (!bytesEqual(computed, frame.blake3Digest)) {
          await sendControlMessage({
            type: 'INTEGRITY_ERROR',
            fileIndex: frame.fileIndex,
            chunkIndex: frame.chunkIndex,
          });
          failWith(
            'INTEGRITY_MISMATCH',
            `Chunk ${frame.chunkIndex} in "${fileState.filename}" failed BLAKE3 verification.`
          );
          return;
        }

        const copy = new Uint8Array(frame.payload.length);
        copy.set(frame.payload);
        fileState.chunks.set(frame.chunkIndex, copy);
        fileState.receivedCount += 1;
        fileState.receivedBytes += copy.length;
        metricsTrackerRef.current.bytesTransferred += copy.length;

        setFileProgress((prev) =>
          prev.map((fp) =>
            fp.index === frame.fileIndex
              ? {
                  ...fp,
                  status: 'transferring',
                  completedChunks: fileState.receivedCount,
                  transferredBytes: fileState.receivedBytes,
                }
              : fp
          )
        );

        // Save lightweight recovery checkpoint every 16 chunks
        if (fileState.receivedCount % 16 === 0 && sessionIdRef.current) {
          saveRecoveryCheckpoint({
            transferId: `${sessionIdRef.current}:${frame.fileIndex}`,
            filename: fileState.filename,
            totalBytes: metricsTrackerRef.current.totalBytes,
            chunkSize: copy.length,
            totalChunks: fileState.totalChunks,
            completedChunks: Array.from(fileState.chunks.keys()),
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        failWith(
          'FILE_WRITE_FAILED',
          err instanceof Error ? err.message : 'Failed processing incoming chunk'
        );
      }
    },
    [failWith, sendControlMessage]
  );

  // Handle incoming control message
  const handleControlMessage = useCallback(
    async (msg: Record<string, unknown>) => {
      const msgType = typeof msg.type === 'string' ? msg.type : '';

      switch (msgType) {
        case 'TRANSFER_MANIFEST': {
          const manifest = msg.manifest as TransferManifest;
          incomingManifestRef.current = manifest;
          setIncomingManifest(manifest);

          recvBuffersRef.current.clear();
          const progressItems: FileProgressItem[] = manifest.files.map((f) => {
            recvBuffersRef.current.set(f.index, {
              chunks: new Map(),
              receivedCount: 0,
              totalChunks: f.totalChunks,
              receivedBytes: 0,
              mimeType: f.mimeType,
              filename: sanitizeFilename(f.name),
            });
            return {
              index: f.index,
              id: f.id,
              name: sanitizeFilename(f.name),
              relativePath: sanitizeRelativePath(f.relativePath),
              size: f.size,
              transferredBytes: 0,
              totalChunks: f.totalChunks,
              completedChunks: 0,
              status: 'queued',
            };
          });

          setFileProgress(progressItems);
          metricsTrackerRef.current.totalBytes = manifest.totalBytes;
          metricsTrackerRef.current.bytesTransferred = 0;
          setMetrics((prev) => ({
            ...prev,
            totalBytes: manifest.totalBytes,
            activeChunkSize: manifest.files[0]?.chunkSize || 256 * 1024,
          }));
          transitionState('AWAITING_ACCEPTANCE');
          break;
        }

        case 'ACCEPT_TRANSFER': {
          setSasConfirmed(true);
          const files = selectedFilesRef.current;
          const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
          const isRelay = transportModeRef.current === 'ws-encrypted-relay';
          const manifestFiles: FileManifestEntry[] = files.map((item, idx) => {
            const chunkSize = selectInitialChunkSize(
              settingsRef.current.chunkSizeMode,
              item.size,
              isRelay
            );
            const totalChunks = item.size === 0 ? 0 : Math.ceil(item.size / chunkSize);
            return {
              index: idx,
              id: item.id,
              name: item.name,
              relativePath: item.relativePath,
              size: item.size,
              mimeType: item.mimeType,
              chunkSize,
              totalChunks,
            };
          });

          const manifest: TransferManifest = {
            protocolVersion: PROTOCOL_VERSION,
            sessionId: sessionIdRef.current || 'ephemeral',
            senderName: localDeviceRef.current.deviceName,
            totalBytes,
            files: manifestFiles,
            createdAt: Date.now(),
          };
          await runSenderPipeline(manifest);
          break;
        }

        case 'REJECT_TRANSFER': {
          failWith('TRANSFER_REJECTED', 'The receiving device declined the incoming transfer.');
          break;
        }

        case 'FILE_COMPLETE': {
          const fileIndex = Number(msg.fileIndex);
          const expectedBlake3 = String(msg.blake3 || '');
          const buf = recvBuffersRef.current.get(fileIndex);
          if (!buf) return;

          transitionState('VERIFYING');
          setFileProgress((prev) =>
            prev.map((fp) =>
              fp.index === fileIndex
                ? { ...fp, status: 'verifying', blake3Expected: expectedBlake3 }
                : fp
            )
          );

          const hasher = new StreamingFileHasher();
          await hasher.init();
          const orderedParts: BlobPart[] = [];

          for (let i = 0; i < buf.totalChunks; i++) {
            const part = buf.chunks.get(i);
            if (!part) {
              failWith('INTEGRITY_MISMATCH', `Missing chunk ${i} for "${buf.filename}".`);
              return;
            }
            hasher.update(part);
            orderedParts.push(part as unknown as BlobPart);
          }

          const computedHex = hasher.digestHex();
          if (computedHex !== expectedBlake3) {
            await sendControlMessage({
              type: 'INTEGRITY_ERROR',
              fileIndex,
            });
            failWith(
              'INTEGRITY_MISMATCH',
              `Final BLAKE3 verification failed for "${buf.filename}".`
            );
            return;
          }

          const blob = new Blob(orderedParts, { type: buf.mimeType || 'application/octet-stream' });
          const downloadUrl = URL.createObjectURL(blob);

          // Free chunk map memory now that Blob holds assembled file
          buf.chunks.clear();
          if (sessionIdRef.current) {
            deleteRecoveryCheckpoint(`${sessionIdRef.current}:${fileIndex}`);
          }

          setFileProgress((prev) => {
            const updated = prev.map((fp) =>
              fp.index === fileIndex
                ? {
                    ...fp,
                    status: 'verified' as const,
                    blake3Expected: expectedBlake3,
                    blake3Computed: computedHex,
                    downloadUrl,
                  }
                : fp
            );
            const allVerified = updated.every((u) => u.status === 'verified');
            if (allVerified) {
              sendControlMessage({
                type: 'ALL_VERIFIED',
                blake3Root: computedHex,
              });
              transitionState('COMPLETED');
              if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
              }
              const m = incomingManifestRef.current;
              addTransferHistory({
                id: m?.sessionId || `rx-${Date.now()}`,
                filename:
                  updated.length === 1
                    ? updated[0].name
                    : `${updated[0].name} (+${updated.length - 1})`,
                fileCount: updated.length,
                direction: 'received',
                totalBytes: m?.totalBytes || 0,
                timestamp: Date.now(),
                status: 'completed',
                deviceName: remotePeerRef.current?.deviceName || 'Sender',
                deviceType: remotePeerRef.current?.deviceType || 'Browser',
                durationMs: Math.max(100, Math.round(performance.now() - metricsTrackerRef.current.startedAt)),
                transport: transportModeRef.current,
                blake3Root: computedHex,
              }).then(() => getTransferHistory().then(setHistory));
            }
            return updated;
          });
          break;
        }

        case 'ALL_VERIFIED': {
          const blake3Root = typeof msg.blake3Root === 'string' ? msg.blake3Root : undefined;
          setFileProgress((prev) =>
            prev.map((fp) => ({ ...fp, status: 'verified', blake3Computed: fp.blake3Expected }))
          );
          transitionState('COMPLETED');
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
          }
          const files = selectedFilesRef.current;
          const totalBytes = files.reduce((s, f) => s + f.size, 0);
          await addTransferHistory({
            id: sessionIdRef.current || `tx-${Date.now()}`,
            filename:
              files.length === 1
                ? files[0].name
                : `${files[0]?.name || 'Files'} (+${files.length - 1})`,
            fileCount: files.length,
            direction: 'sent',
            totalBytes,
            timestamp: Date.now(),
            status: 'completed',
            deviceName: remotePeerRef.current?.deviceName || 'Receiver',
            deviceType: remotePeerRef.current?.deviceType || 'Browser',
            durationMs: Math.max(100, Math.round(performance.now() - metricsTrackerRef.current.startedAt)),
            transport: transportModeRef.current,
            blake3Root,
          });
          setHistory(await getTransferHistory());
          break;
        }

        case 'INTEGRITY_ERROR': {
          failWith('INTEGRITY_MISMATCH', 'Peer reported a BLAKE3 chunk integrity verification failure.');
          break;
        }

        case 'PAUSE_TRANSFER': {
          pausedRef.current = true;
          transitionState('PAUSED');
          break;
        }

        case 'RESUME_TRANSFER': {
          pausedRef.current = false;
          transitionState('TRANSFERRING');
          const waiters = pauseWaitersRef.current.splice(0);
          waiters.forEach((fn) => fn());
          break;
        }

        case 'CANCEL_TRANSFER': {
          cancelledRef.current = true;
          const waiters = pauseWaitersRef.current.splice(0);
          waiters.forEach((fn) => fn());
          transitionState('CANCELLED');
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
          }
          break;
        }
      }
    },
    [failWith, runSenderPipeline, sendControlMessage, transitionState]
  );

  const sendManifestWhenReady = useCallback(async () => {
    if (roleRef.current !== 'sender') return;
    const files = selectedFilesRef.current;
    if (files.length === 0) return;
    const isRelay = transportModeRef.current === 'ws-encrypted-relay';
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

    const manifestFiles: FileManifestEntry[] = files.map((item, idx) => {
      const chunkSize = selectInitialChunkSize(
        settingsRef.current.chunkSizeMode,
        item.size,
        isRelay
      );
      return {
        index: idx,
        id: item.id,
        name: item.name,
        relativePath: item.relativePath,
        size: item.size,
        mimeType: item.mimeType,
        chunkSize,
        totalChunks: item.size === 0 ? 0 : Math.ceil(item.size / chunkSize),
      };
    });

    const manifest: TransferManifest = {
      protocolVersion: PROTOCOL_VERSION,
      sessionId: sessionIdRef.current || 'ephemeral',
      senderName: localDeviceRef.current.deviceName,
      totalBytes,
      files: manifestFiles,
      createdAt: Date.now(),
    };

    setFileProgress(
      manifestFiles.map((f) => ({
        index: f.index,
        id: f.id,
        name: f.name,
        relativePath: f.relativePath,
        size: f.size,
        transferredBytes: 0,
        totalChunks: f.totalChunks,
        completedChunks: 0,
        status: 'queued',
      }))
    );

    transitionState('AWAITING_ACCEPTANCE');
    await sendControlMessage({ type: 'TRANSFER_MANIFEST', manifest });
  }, [sendControlMessage, transitionState]);

  const setupWebRTC = useCallback(
    async (isInitiator: boolean) => {
      transitionState('CONNECTING');
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;

      const wireControl = (dc: RTCDataChannel) => {
        controlChannelRef.current = dc;
        dc.onopen = async () => {
          if (iceFallbackTimerRef.current) {
            clearTimeout(iceFallbackTimerRef.current);
            iceFallbackTimerRef.current = null;
          }
          if (transportModeRef.current === 'unavailable') {
            transportModeRef.current = 'webrtc-direct-stun';
          }
          setMetrics((prev) => ({ ...prev, transport: transportModeRef.current }));
          addLog('info', 'WebRTC control channel open');
          if (roleRef.current === 'sender') {
            await sendManifestWhenReady();
          }
        };
        dc.onmessage = (ev) => {
          if (typeof ev.data === 'string') {
            try {
              const parsed = JSON.parse(ev.data) as Record<string, unknown>;
              handleControlMessage(parsed);
            } catch {}
          }
        };
      };

      const wireData = (dc: RTCDataChannel) => {
        dc.binaryType = 'arraybuffer';
        dataChannelRef.current = dc;
        dc.onopen = () => {
          addLog('info', 'WebRTC binary data channel open');
        };
        dc.onmessage = (ev) => {
          if (ev.data instanceof ArrayBuffer) {
            handleIncomingBinaryChunk(new Uint8Array(ev.data));
          }
        };
      };

      if (isInitiator) {
        wireControl(pc.createDataChannel('dropzero-control', { ordered: true }));
        wireData(pc.createDataChannel('dropzero-data', { ordered: true }));
      } else {
        pc.ondatachannel = (ev) => {
          if (ev.channel.label === 'dropzero-control') {
            wireControl(ev.channel);
          } else if (ev.channel.label === 'dropzero-data') {
            wireData(ev.channel);
          }
        };
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'signal:relay',
              signalType: 'ice-candidate',
              payload: ev.candidate.toJSON(),
            })
          );
        }
      };

      pc.oniceconnectionstatechange = async () => {
        const s = pc.iceConnectionState;
        addLog('info', `ICE state: ${s}`);
        if (s === 'connected' || s === 'completed') {
          if (iceFallbackTimerRef.current) {
            clearTimeout(iceFallbackTimerRef.current);
            iceFallbackTimerRef.current = null;
          }
          try {
            const stats = await pc.getStats();
            stats.forEach((report) => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                const remoteCand = stats.get(report.remoteCandidateId);
                if (remoteCand?.candidateType === 'host') {
                  transportModeRef.current = 'webrtc-direct-lan';
                } else if (remoteCand?.candidateType === 'relay') {
                  transportModeRef.current = 'webrtc-turn-relay';
                } else {
                  transportModeRef.current = 'webrtc-direct-stun';
                }
                setMetrics((prev) => ({
                  ...prev,
                  transport: transportModeRef.current,
                  iceCandidateType: remoteCand?.candidateType || null,
                }));
              }
            });
          } catch {}
        } else if (s === 'failed') {
          if (settingsRef.current.preferredTransport !== 'webrtc-only') {
            transportModeRef.current = 'ws-encrypted-relay';
            setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
            addLog('warn', 'Direct WebRTC failed; switched to E2E encrypted relay fallback');
            if (roleRef.current === 'sender') {
              await sendManifestWhenReady();
            }
          } else {
            failWith(
              'TRANSPORT_FAILED',
              'Direct WebRTC ICE negotiation failed and relay fallback is disabled.'
            );
          }
        }
      };

      // Timeout safeguard to fall back to encrypted relay if direct ICE hangs behind strict NAT
      iceFallbackTimerRef.current = setTimeout(async () => {
        const dcOpen = controlChannelRef.current?.readyState === 'open';
        if (!dcOpen && settingsRef.current.preferredTransport !== 'webrtc-only') {
          transportModeRef.current = 'ws-encrypted-relay';
          setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
          addLog('warn', 'Direct WebRTC timed out; switched to E2E encrypted relay fallback');
          if (roleRef.current === 'sender') {
            await sendManifestWhenReady();
          }
        }
      }, 10_000);

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsRef.current?.send(
          JSON.stringify({
            type: 'signal:relay',
            signalType: 'offer',
            payload: pc.localDescription,
          })
        );
      }
    },
    [addLog, failWith, handleControlMessage, handleIncomingBinaryChunk, sendManifestWhenReady, transitionState]
  );

  // Connect WebSocket signaling and bind handlers
  const connectSignaling = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const url = getSignalingWsUrl();
      if (!url) {
        reject(new DropZeroError('NETWORK_UNAVAILABLE', 'Signaling URL unavailable'));
        return;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new DropZeroError('NETWORK_UNAVAILABLE', 'Signaling server timed out'));
        }
      }, 8000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setSignalingConnected(true);
        addLog('info', 'Connected to DROPZERO signaling');
        resolve(ws);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setSignalingConnected(false);
        reject(new DropZeroError('NETWORK_UNAVAILABLE', 'Failed to reach signaling server'));
      };

      ws.onclose = () => {
        setSignalingConnected(false);
      };

      ws.onmessage = async (event) => {
        if (typeof event.data !== 'string') return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = typeof msg.type === 'string' ? msg.type : '';
        switch (type) {
          case 'discovery:sessions': {
            setDiscoverableSessions((msg.sessions as DiscoverableSession[]) || []);
            break;
          }

          case 'session:created': {
            sessionIdRef.current = String(msg.sessionId);
            setSessionId(String(msg.sessionId));
            setPairingCode(String(msg.pairingCode));
            setPairingExpiresAt(Number(msg.expiresAt));
            transitionState('WAITING_FOR_PEER');
            break;
          }

          case 'peer:joined': {
            const peer = msg.remotePeer as RemotePeerMetadata;
            remotePeerRef.current = peer;
            setRemotePeer(peer);
            transitionState('PEER_DETECTED');
            transitionState('AUTHENTICATING');

            if (ephemeralRef.current && sessionIdRef.current) {
              const sec = await deriveSessionSecurity(
                ephemeralRef.current.keyPair.privateKey,
                ephemeralRef.current.publicKeyJwk,
                peer.publicKeyJwk,
                sessionIdRef.current
              );
              aesKeyRef.current = sec.aesKey;
              setSasCode(sec.sasCode);
              setRemotePeer((prev) =>
                prev ? { ...prev, fingerprint: sec.remoteFingerprint } : prev
              );
              if (settingsRef.current.rememberDevices) {
                await saveRememberedDevice({
                  id: sec.remoteFingerprint,
                  deviceName: peer.deviceName,
                  deviceType: peer.deviceType,
                  platform: peer.platform,
                  fingerprint: sec.remoteFingerprint,
                  lastSessionAt: Date.now(),
                  capabilities: peer.capabilities,
                });
                setRememberedDevices(await getRememberedDevices());
              }
            }
            await setupWebRTC(true);
            break;
          }

          case 'session:joined': {
            const sId = String(msg.sessionId);
            const peer = msg.remotePeer as RemotePeerMetadata;
            const hostMode = msg.mode === 'receive' ? 'receive' : 'send';
            // If host created a 'send' session, guest is 'receiver'; if host created 'receive' session, guest is 'sender'
            const resolvedRole = hostMode === 'send' ? 'receiver' : 'sender';
            roleRef.current = resolvedRole;
            setRole(resolvedRole);

            sessionIdRef.current = sId;
            setSessionId(sId);
            setPairingCode(String(msg.pairingCode));
            setPairingExpiresAt(Number(msg.expiresAt));
            remotePeerRef.current = peer;
            setRemotePeer(peer);

            transitionState('PEER_DETECTED');
            transitionState('AUTHENTICATING');

            if (ephemeralRef.current) {
              const sec = await deriveSessionSecurity(
                ephemeralRef.current.keyPair.privateKey,
                ephemeralRef.current.publicKeyJwk,
                peer.publicKeyJwk,
                sId
              );
              aesKeyRef.current = sec.aesKey;
              setSasCode(sec.sasCode);
              setRemotePeer((prev) =>
                prev ? { ...prev, fingerprint: sec.remoteFingerprint } : prev
              );
              if (settingsRef.current.rememberDevices) {
                await saveRememberedDevice({
                  id: sec.remoteFingerprint,
                  deviceName: peer.deviceName,
                  deviceType: peer.deviceType,
                  platform: peer.platform,
                  fingerprint: sec.remoteFingerprint,
                  lastSessionAt: Date.now(),
                  capabilities: peer.capabilities,
                });
                setRememberedDevices(await getRememberedDevices());
              }
            }
            await setupWebRTC(false);
            break;
          }

          case 'signal:relay': {
            const pc = pcRef.current;
            if (!pc) return;
            const signalType = msg.signalType;
            if (signalType === 'offer') {
              await pc.setRemoteDescription(
                new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit)
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(
                JSON.stringify({
                  type: 'signal:relay',
                  signalType: 'answer',
                  payload: pc.localDescription,
                })
              );
            } else if (signalType === 'answer') {
              await pc.setRemoteDescription(
                new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit)
              );
            } else if (signalType === 'ice-candidate') {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.payload as RTCIceCandidateInit));
              } catch {}
            }
            break;
          }

          case 'relay:packet': {
            const key = aesKeyRef.current;
            if (!key) return;
            try {
              const plain = await decryptRelayFrame(
                key,
                String(msg.iv),
                String(msg.ciphertext)
              );
              if (plain[0] === 0x01) {
                await handleIncomingBinaryChunk(plain.subarray(1));
              } else {
                const decoded = JSON.parse(new TextDecoder().decode(plain)) as {
                  kind: string;
                  body: Record<string, unknown>;
                };
                if (decoded.kind === 'ctrl') {
                  await handleControlMessage(decoded.body);
                }
              }
            } catch {
              failWith('AUTHENTICATION_FAILED', 'Failed to decrypt authenticated relay frame.');
            }
            break;
          }

          case 'peer:left':
          case 'session:ended': {
            if (stateRef.current !== 'COMPLETED' && stateRef.current !== 'IDLE') {
              failWith('TRANSPORT_FAILED', 'Remote peer disconnected from session.', true);
            }
            break;
          }

          case 'session:expired': {
            failWith('SESSION_EXPIRED', 'Pairing session expired after inactivity.');
            break;
          }

          case 'error': {
            const code = String(msg.code || 'TRANSPORT_FAILED') as DropZeroErrorCode;
            const message = String(msg.message || 'Signaling error');
            failWith(
              code === 'PEER_NOT_FOUND' || code === 'PAIRING_EXPIRED' ? code : 'TRANSPORT_FAILED',
              message
            );
            break;
          }
        }
      };
    });
  }, [addLog, failWith, handleControlMessage, handleIncomingBinaryChunk, setupWebRTC, transitionState]);

  const startSendSession = useCallback(async () => {
    if (selectedFilesRef.current.length === 0) {
      failWith('FILE_READ_FAILED', 'Select at least one file before starting a send session.');
      return;
    }
    teardownConnection();
    setError(null);
    setSasCode(null);
    setSasConfirmed(false);
    setRemotePeer(null);
    setIncomingManifest(null);
    roleRef.current = 'sender';
    setRole('sender');
    transportModeRef.current = 'unavailable';

    stateRef.current = 'SELECTING_FILES';
    transitionState('CREATING_SESSION');

    try {
      const identity = await generateEphemeralIdentity();
      ephemeralRef.current = identity;
      const code = generatePairingCode();
      const ws = await connectSignaling();
      ws.send(
        JSON.stringify({
          type: 'session:create',
          mode: 'send',
          pairingCode: code,
          discoverable: settingsRef.current.discoverableOnSignaling,
          device: {
            name: localDeviceRef.current.deviceName,
            type: localDeviceRef.current.deviceType,
            platform: localDeviceRef.current.platform,
            capabilities: localDeviceRef.current.capabilities,
          },
          publicKeyJwk: identity.publicKeyJwk,
        })
      );
    } catch (err) {
      failWith(
        err instanceof DropZeroError ? err.code : 'NETWORK_UNAVAILABLE',
        err instanceof Error ? err.message : 'Unable to start send session'
      );
    }
  }, [connectSignaling, failWith, teardownConnection, transitionState]);

  const startReceiveSession = useCallback(async () => {
    teardownConnection();
    setError(null);
    setSasCode(null);
    setSasConfirmed(false);
    setRemotePeer(null);
    setIncomingManifest(null);
    setFileProgress([]);
    roleRef.current = 'receiver';
    setRole('receiver');
    transportModeRef.current = 'unavailable';

    stateRef.current = 'IDLE';
    transitionState('CREATING_SESSION');

    try {
      const identity = await generateEphemeralIdentity();
      ephemeralRef.current = identity;
      const code = generatePairingCode();
      const ws = await connectSignaling();
      ws.send(
        JSON.stringify({
          type: 'session:create',
          mode: 'receive',
          pairingCode: code,
          discoverable: settingsRef.current.discoverableOnSignaling,
          device: {
            name: localDeviceRef.current.deviceName,
            type: localDeviceRef.current.deviceType,
            platform: localDeviceRef.current.platform,
            capabilities: localDeviceRef.current.capabilities,
          },
          publicKeyJwk: identity.publicKeyJwk,
        })
      );
    } catch (err) {
      failWith(
        err instanceof DropZeroError ? err.code : 'NETWORK_UNAVAILABLE',
        err instanceof Error ? err.message : 'Unable to start receive session'
      );
    }
  }, [connectSignaling, failWith, teardownConnection, transitionState]);

  const joinSessionByCode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        failWith('PEER_NOT_FOUND', 'Enter a valid 6-character pairing code.');
        return;
      }

      teardownConnection();
      setError(null);
      setSasCode(null);
      setSasConfirmed(false);
      setRemotePeer(null);
      transportModeRef.current = 'unavailable';

      try {
        const identity = await generateEphemeralIdentity();
        ephemeralRef.current = identity;
        const ws = await connectSignaling();
        ws.send(
          JSON.stringify({
            type: 'session:join',
            pairingCode: code,
            device: {
              name: localDeviceRef.current.deviceName,
              type: localDeviceRef.current.deviceType,
              platform: localDeviceRef.current.platform,
              capabilities: localDeviceRef.current.capabilities,
            },
            publicKeyJwk: identity.publicKeyJwk,
          })
        );
      } catch (err) {
        failWith(
          err instanceof DropZeroError ? err.code : 'NETWORK_UNAVAILABLE',
          err instanceof Error ? err.message : 'Unable to join session'
        );
      }
    },
    [connectSignaling, failWith, teardownConnection]
  );

  const acceptIncomingTransfer = useCallback(async () => {
    setSasConfirmed(true);
    cancelledRef.current = false;
    pausedRef.current = false;
    transitionState('TRANSFERRING');
    startMetricsPolling();
    await sendControlMessage({ type: 'ACCEPT_TRANSFER' });
  }, [sendControlMessage, startMetricsPolling, transitionState]);

  const rejectIncomingTransfer = useCallback(() => {
    sendControlMessage({ type: 'REJECT_TRANSFER' });
    transitionState('CANCELLED');
    teardownConnection();
  }, [sendControlMessage, teardownConnection, transitionState]);

  const pauseTransfer = useCallback(() => {
    pausedRef.current = true;
    transitionState('PAUSED');
    sendControlMessage({ type: 'PAUSE_TRANSFER' });
  }, [sendControlMessage, transitionState]);

  const resumeTransfer = useCallback(() => {
    pausedRef.current = false;
    transitionState('TRANSFERRING');
    const waiters = pauseWaitersRef.current.splice(0);
    waiters.forEach((fn) => fn());
    sendControlMessage({ type: 'RESUME_TRANSFER' });
  }, [sendControlMessage, transitionState]);

  const cancelTransfer = useCallback(() => {
    cancelledRef.current = true;
    const waiters = pauseWaitersRef.current.splice(0);
    waiters.forEach((fn) => fn());
    sendControlMessage({ type: 'CANCEL_TRANSFER' });
    transitionState('CANCELLED');
    teardownConnection();
  }, [sendControlMessage, teardownConnection, transitionState]);

  const switchToRelayFallback = useCallback(async () => {
    if (iceFallbackTimerRef.current) {
      clearTimeout(iceFallbackTimerRef.current);
      iceFallbackTimerRef.current = null;
    }
    transportModeRef.current = 'ws-encrypted-relay';
    setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
    addLog('info', 'Manually switched to E2E encrypted relay transport');
    if (roleRef.current === 'sender' && stateRef.current === 'CONNECTING') {
      await sendManifestWhenReady();
    }
  }, [addLog, sendManifestWhenReady]);

  const resetWorkspace = useCallback(() => {
    teardownConnection();
    cancelledRef.current = false;
    pausedRef.current = false;
    setError(null);
    setSessionId(null);
    sessionIdRef.current = null;
    setPairingCode(null);
    setPairingExpiresAt(null);
    setRemotePeer(null);
    remotePeerRef.current = null;
    setSasCode(null);
    setSasConfirmed(false);
    setIncomingManifest(null);
    incomingManifestRef.current = null;
    setFileProgress([]);
    setMetrics(initialMetrics);
    setRole(null);
    roleRef.current = null;
    stateRef.current = selectedFilesRef.current.length > 0 ? 'SELECTING_FILES' : 'IDLE';
    setStateRaw(stateRef.current);
  }, [teardownConnection]);

  const refreshDiscovery = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'discovery:list' }));
      return;
    }
    const url = getSignalingWsUrl();
    if (!url) return;
    const tempWs = new WebSocket(url);
    tempWs.onopen = () => {
      tempWs.send(JSON.stringify({ type: 'discovery:list' }));
    };
    tempWs.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
        if (msg.type === 'discovery:sessions') {
          setDiscoverableSessions((msg.sessions as DiscoverableSession[]) || []);
        }
      } catch {}
      tempWs.close();
    };
  }, []);

  const deleteHistoryItem = useCallback(async (id: string) => {
    await deleteHistoryEntry(id);
    setHistory(await getTransferHistory());
  }, []);

  const clearAllHistory = useCallback(async () => {
    await clearTransferHistory();
    setHistory([]);
  }, []);

  const forgetDevice = useCallback(async (id: string) => {
    await removeRememberedDevice(id);
    setRememberedDevices(await getRememberedDevices());
  }, []);

  const clearAllLocalData = useCallback(async () => {
    await Promise.all([
      clearTransferHistory(),
      clearRememberedDevices(),
      clearRecoveryCheckpoints(),
    ]);
    setHistory([]);
    setRememberedDevices([]);
    addLog('info', 'Cleared all local IndexedDB metadata');
  }, [addLog]);

  const exportDiagnostics = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        protocolVersion: PROTOCOL_VERSION,
        state: stateRef.current,
        transport: metrics.transport,
        localDevice: {
          deviceType: localDevice.deviceType,
          platform: localDevice.platform,
          capabilities: localDevice.capabilities,
        },
        metrics,
        recentEvents: logs.slice(0, 60),
      },
      null,
      2
    );
  }, [localDevice, logs, metrics]);

  const totalSelectedBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <TransferContext.Provider
      value={{
        state,
        role,
        error,
        localDevice,
        settings,
        updateSettings,
        selectedFiles,
        totalSelectedBytes,
        addFiles,
        addDroppedItems,
        removeSelectedFile,
        clearSelectedFiles,
        sessionId,
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
        history,
        rememberedDevices,
        deleteHistoryItem,
        clearAllHistory,
        forgetDevice,
        clearAllLocalData,
        logs,
        exportDiagnostics,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const ctx = useContext(TransferContext);
  if (!ctx) {
    throw new Error('useTransfer must be used within TransferProvider');
  }
  return ctx;
}
