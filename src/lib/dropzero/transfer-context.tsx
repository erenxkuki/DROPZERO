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

interface SignalingTransport {
  kind: 'ws' | 'http';
  send: (payload: Record<string, unknown>) => Promise<void>;
  close: () => void;
  isOpen: () => boolean;
}

interface TransferContextValue {
  state: TransferState;
  role: 'sender' | 'receiver' | null;
  error: { code: DropZeroErrorCode; message: string; recoverable: boolean } | null;

  localDevice: LocalDeviceIdentity;
  settings: DropZeroSettings;
  updateSettings: (partial: Partial<DropZeroSettings>) => Promise<void>;

  selectedFiles: SelectedFileItem[];
  totalSelectedBytes: number;
  addFiles: (files: FileList | File[]) => void;
  addDroppedItems: (dataTransfer: DataTransfer) => Promise<void>;
  removeSelectedFile: (id: string) => void;
  clearSelectedFiles: () => void;

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

  startSendSession: () => Promise<void>;
  startReceiveSession: () => Promise<void>;
  joinSessionByCode: (code: string) => Promise<void>;
  sendManifestWhenReady: () => Promise<void>;
  acceptIncomingTransfer: () => Promise<void>;
  rejectIncomingTransfer: () => void;
  pauseTransfer: () => void;
  resumeTransfer: () => void;
  cancelTransfer: () => void;
  resetWorkspace: () => void;
  switchToRelayFallback: () => void;

  incomingManifest: TransferManifest | null;
  fileProgress: FileProgressItem[];
  metrics: TransferMetrics;

  history: TransferHistoryEntry[];
  rememberedDevices: RememberedDevice[];
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  forgetDevice: (id: string) => Promise<void>;
  clearAllLocalData: () => Promise<void>;

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
  const override = import.meta.env.VITE_DROPZERO_SIGNALING_URL as string | undefined;
  if (override && override.trim().length > 0) return override.trim();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/signaling`;
}

function getIceServers(): RTCIceServer[] {
  const stun =
    (import.meta.env.VITE_DROPZERO_STUN_URL as string | undefined)?.trim() ||
    'stun:stun.l.google.com:19302';
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
          } catch {}
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

  const signalingRef = useRef<SignalingTransport | null>(null);
  const signalingConnectPromiseRef = useRef<Promise<SignalingTransport> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingAnswerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const ephemeralRef = useRef<EphemeralIdentity | null>(null);
  const aesKeyRef = useRef<CryptoKey | null>(null);
  const transportModeRef = useRef<TransportKind>('unavailable');
  const relaySeqRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const cancelledRef = useRef<boolean>(false);
  const pauseWaitersRef = useRef<Array<() => void>>([]);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendManifestRef = useRef<(() => Promise<void>) | null>(null);
  const metricsTrackerRef = useRef<ActiveMetricsTracker>({
    startedAt: 0,
    lastSampleAt: 0,
    lastBytes: 0,
    smoothedBps: null,
    peakBps: null,
    bytesTransferred: 0,
    totalBytes: 0,
  });

  const recvBuffersRef = useRef<
    Map<
      number,
      {
        chunks: Map<number, Uint8Array>;
        receivedCount: number;
        totalChunks: number;
        receivedBytes: number;
        expectedBlake3?: string;
        completeRequested?: boolean;
        finalized?: boolean;
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

  const teardownConnection = useCallback((closeSignaling = false) => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (iceFallbackTimerRef.current) {
      clearTimeout(iceFallbackTimerRef.current);
      iceFallbackTimerRef.current = null;
    }
    pendingIceCandidatesRef.current = [];
    pendingOfferRef.current = null;
    pendingAnswerRef.current = null;

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
    if (signalingRef.current) {
      try {
        if (signalingRef.current.isOpen()) {
          void signalingRef.current.send({ type: 'session:leave' });
        }
        if (closeSignaling) {
          signalingRef.current.close();
          signalingRef.current = null;
          setSignalingConnected(false);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    return () => {
      teardownConnection(true);
    };
  }, [teardownConnection]);

  const sendControlMessage = useCallback(async (payload: Record<string, unknown>) => {
    const dc = controlChannelRef.current;
    if (dc && dc.readyState === 'open' && transportModeRef.current !== 'ws-encrypted-relay') {
      dc.send(JSON.stringify(payload));
      return;
    }
    const sig = signalingRef.current;
    const key = aesKeyRef.current;
    if (sig && sig.isOpen() && key) {
      const bytes = new TextEncoder().encode(JSON.stringify({ kind: 'ctrl', body: payload }));
      const enc = await encryptRelayFrame(key, bytes);
      relaySeqRef.current += 1;
      await sig.send({
        type: 'relay:packet',
        seq: relaySeqRef.current,
        iv: enc.iv,
        ciphertext: enc.ciphertext,
      });
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
        tracker.smoothedBps === null ? rawBps : tracker.smoothedBps * 0.65 + rawBps * 0.35;
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
          let selectedPairId: string | null = null;
          stats.forEach((report) => {
            if (report.type === 'transport' && typeof report.selectedCandidatePairId === 'string') {
              selectedPairId = report.selectedCandidatePairId;
            }
          });
          stats.forEach((report) => {
            const isActivePair =
              report.type === 'candidate-pair' &&
              (selectedPairId ? report.id === selectedPairId : report.nominated || report.state === 'succeeded');
            if (isActivePair) {
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
        } catch {}
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
      const fallbackFiles = Array.from(dataTransfer.files || []);
      const rawItems = Array.from(dataTransfer.items || []);
      const snapshots = rawItems.map((item) => ({
        entry: item.webkitGetAsEntry?.() ?? null,
        file: item.kind === 'file' ? item.getAsFile() : null,
      }));

      const extracted: File[] = [];
      for (const snap of snapshots) {
        if (snap.entry) {
          const files = await readEntryFiles(snap.entry);
          extracted.push(...files);
        } else if (snap.file) {
          extracted.push(snap.file);
        }
      }

      if (extracted.length > 0) {
        addFiles(extracted);
      } else if (fallbackFiles.length > 0) {
        addFiles(fallbackFiles);
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
              const sig = signalingRef.current;
              const key = aesKeyRef.current;
              if (!sig || !sig.isOpen() || !key) {
                throw new DropZeroError('TRANSPORT_FAILED', 'Relay connection unavailable', true);
              }
              const payloadWrapper = new Uint8Array(1 + frame.length);
              payloadWrapper[0] = 0x01;
              payloadWrapper.set(frame, 1);
              const enc = await encryptRelayFrame(key, payloadWrapper);
              relaySeqRef.current += 1;
              await sig.send({
                type: 'relay:packet',
                seq: relaySeqRef.current,
                iv: enc.iv,
                ciphertext: enc.ciphertext,
              });
            } else {
              const dc = dataChannelRef.current;
              if (!dc || dc.readyState !== 'open') {
                throw new DropZeroError('TRANSPORT_FAILED', 'Direct WebRTC data channel closed', true);
              }
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

          if (totalChunks === 0) {
            setFileProgress((prev) =>
              prev.map((fp) =>
                fp.index === fileIdx ? { ...fp, completedChunks: 0, transferredBytes: 0 } : fp
              )
            );
          }

          const fullBlake3 = fileHasher.digestHex();
          lastFileHash = fullBlake3;

          if (transportModeRef.current !== 'ws-encrypted-relay') {
            const dc = dataChannelRef.current;
            let drainAttempts = 0;
            while (dc && dc.readyState === 'open' && dc.bufferedAmount > 0 && drainAttempts < 200) {
              await new Promise((r) => setTimeout(r, 15));
              drainAttempts += 1;
            }
          }

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

  const finalizeReceivedFile = useCallback(
    async (fileIndex: number) => {
      const buf = recvBuffersRef.current.get(fileIndex);
      if (!buf || buf.finalized || !buf.completeRequested || buf.expectedBlake3 === undefined) {
        return;
      }
      if (buf.receivedCount < buf.totalChunks) {
        return;
      }

      buf.finalized = true;
      transitionState('VERIFYING');
      setFileProgress((prev) =>
        prev.map((fp) =>
          fp.index === fileIndex
            ? { ...fp, status: 'verifying', blake3Expected: buf.expectedBlake3 }
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
      if (computedHex !== buf.expectedBlake3) {
        await sendControlMessage({ type: 'INTEGRITY_ERROR', fileIndex });
        failWith(
          'INTEGRITY_MISMATCH',
          `Final BLAKE3 verification failed for "${buf.filename}".`
        );
        return;
      }

      const blob = new Blob(orderedParts, { type: buf.mimeType || 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(blob);

      buf.chunks.clear();
      if (sessionIdRef.current) {
        deleteRecoveryCheckpoint(`${sessionIdRef.current}:${fileIndex}`);
      }

      setFileProgress((prev) =>
        prev.map((fp) =>
          fp.index === fileIndex
            ? {
                ...fp,
                status: 'verified' as const,
                blake3Expected: buf.expectedBlake3,
                blake3Computed: computedHex,
                downloadUrl,
              }
            : fp
        )
      );

      const allFinalized = Array.from(recvBuffersRef.current.values()).every((b) => b.finalized);
      if (allFinalized) {
        await sendControlMessage({ type: 'ALL_VERIFIED', blake3Root: computedHex });
        transitionState('COMPLETED');
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        const m = incomingManifestRef.current;
        const manifestFiles = m?.files || [];
        await addTransferHistory({
          id: m?.sessionId || `rx-${Date.now()}`,
          filename:
            manifestFiles.length <= 1
              ? manifestFiles[0]?.name || buf.filename
              : `${manifestFiles[0].name} (+${manifestFiles.length - 1})`,
          fileCount: manifestFiles.length || 1,
          direction: 'received',
          totalBytes: m?.totalBytes || buf.receivedBytes,
          timestamp: Date.now(),
          status: 'completed',
          deviceName: remotePeerRef.current?.deviceName || 'Sender',
          deviceType: remotePeerRef.current?.deviceType || 'Browser',
          durationMs: Math.max(
            100,
            Math.round(performance.now() - metricsTrackerRef.current.startedAt)
          ),
          transport: transportModeRef.current,
          blake3Root: computedHex,
        });
        setHistory(await getTransferHistory());
      }
    },
    [failWith, sendControlMessage, transitionState]
  );

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

        if (!fileState.chunks.has(frame.chunkIndex)) {
          const copy = new Uint8Array(frame.payload.length);
          copy.set(frame.payload);
          fileState.chunks.set(frame.chunkIndex, copy);
          fileState.receivedCount += 1;
          fileState.receivedBytes += copy.length;
          metricsTrackerRef.current.bytesTransferred += copy.length;
        }

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

        if (fileState.receivedCount % 16 === 0 && sessionIdRef.current) {
          saveRecoveryCheckpoint({
            transferId: `${sessionIdRef.current}:${frame.fileIndex}`,
            filename: fileState.filename,
            totalBytes: metricsTrackerRef.current.totalBytes,
            chunkSize: frame.payload.length,
            totalChunks: fileState.totalChunks,
            completedChunks: Array.from(fileState.chunks.keys()),
            updatedAt: Date.now(),
          });
        }

        if (fileState.completeRequested && fileState.receivedCount >= fileState.totalChunks) {
          await finalizeReceivedFile(frame.fileIndex);
        }
      } catch (err) {
        failWith(
          'FILE_WRITE_FAILED',
          err instanceof Error ? err.message : 'Failed processing incoming chunk'
        );
      }
    },
    [failWith, finalizeReceivedFile, sendControlMessage]
  );

  const handleControlMessage = useCallback(
    async (msg: Record<string, unknown>) => {
      const msgType = typeof msg.type === 'string' ? msg.type : '';

      switch (msgType) {
        case 'TRANSFER_MANIFEST': {
          if (iceFallbackTimerRef.current) {
            clearTimeout(iceFallbackTimerRef.current);
            iceFallbackTimerRef.current = null;
          }
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
            transport: transportModeRef.current,
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
          setMetrics((prev) => ({
            ...prev,
            totalBytes,
            activeChunkSize: manifestFiles[0]?.chunkSize || prev.activeChunkSize,
          }));
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
          buf.expectedBlake3 = expectedBlake3;
          buf.completeRequested = true;
          if (buf.receivedCount >= buf.totalChunks) {
            await finalizeReceivedFile(fileIndex);
          }
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

        case 'TRANSPORT_SWITCH': {
          if (iceFallbackTimerRef.current) {
            clearTimeout(iceFallbackTimerRef.current);
            iceFallbackTimerRef.current = null;
          }
          transportModeRef.current = 'ws-encrypted-relay';
          setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
          addLog('info', 'Peer switched transport to E2E encrypted relay');
          if (
            roleRef.current === 'sender' &&
            (stateRef.current === 'CONNECTING' ||
              stateRef.current === 'AUTHENTICATING' ||
              stateRef.current === 'PEER_DETECTED')
          ) {
            await sendManifestRef.current?.();
          }
          break;
        }
      }
    },
    [addLog, failWith, finalizeReceivedFile, runSenderPipeline, transitionState]
  );

  const sendManifestWhenReady = useCallback(async () => {
    if (roleRef.current !== 'sender') return;
    const files = selectedFilesRef.current;
    if (files.length === 0) {
      transitionState('SELECTING_FILES');
      addLog('info', 'Paired with receiver — select files to begin sending');
      return;
    }
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

    setMetrics((prev) => ({
      ...prev,
      totalBytes,
      activeChunkSize: manifestFiles[0]?.chunkSize || prev.activeChunkSize,
    }));

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
  }, [addLog, sendControlMessage, transitionState]);

  useEffect(() => {
    sendManifestRef.current = sendManifestWhenReady;
  }, [sendManifestWhenReady]);

  const flushPendingIce = useCallback(
    async (pc: RTCPeerConnection) => {
      if (!pc.remoteDescription) return;
      const queued = pendingIceCandidatesRef.current.splice(0);
      for (const cand of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {}
      }
    },
    []
  );

  const setupWebRTC = useCallback(
    async (isInitiator: boolean) => {
      transitionState('CONNECTING');

      if (settingsRef.current.preferredTransport === 'relay-fallback') {
        transportModeRef.current = 'ws-encrypted-relay';
        setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
        addLog('info', 'Using E2E encrypted WebSocket relay transport');
        if (roleRef.current === 'sender') {
          await sendManifestWhenReady();
        }
        return;
      }

      if (typeof RTCPeerConnection === 'undefined') {
        if (settingsRef.current.preferredTransport !== 'webrtc-only') {
          transportModeRef.current = 'ws-encrypted-relay';
          setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
          addLog('warn', 'WebRTC unavailable; using E2E encrypted relay fallback');
          if (roleRef.current === 'sender') {
            await sendManifestWhenReady();
          }
          return;
        }
        failWith('UNSUPPORTED_PLATFORM', 'WebRTC is unavailable in this browser.');
        return;
      }

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
        dc.onopen = () => addLog('info', 'WebRTC binary data channel open');
        dc.onmessage = async (ev) => {
          if (ev.data instanceof ArrayBuffer) {
            await handleIncomingBinaryChunk(new Uint8Array(ev.data));
          } else if (ev.data instanceof Blob) {
            const buf = await ev.data.arrayBuffer();
            await handleIncomingBinaryChunk(new Uint8Array(buf));
          }
        };
      };

      if (isInitiator) {
        wireControl(pc.createDataChannel('dropzero-control', { ordered: true }));
        wireData(pc.createDataChannel('dropzero-data', { ordered: true }));
      } else {
        pc.ondatachannel = (ev) => {
          if (ev.channel.label === 'dropzero-control') wireControl(ev.channel);
          else if (ev.channel.label === 'dropzero-data') wireData(ev.channel);
        };
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate && signalingRef.current?.isOpen()) {
          void signalingRef.current.send({
            type: 'signal:relay',
            signalType: 'ice-candidate',
            payload: ev.candidate.toJSON(),
          });
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
            let selectedPairId: string | null = null;
            stats.forEach((report) => {
              if (report.type === 'transport' && typeof report.selectedCandidatePairId === 'string') {
                selectedPairId = report.selectedCandidatePairId;
              }
            });
            stats.forEach((report) => {
              const isActivePair =
                report.type === 'candidate-pair' &&
                (selectedPairId ? report.id === selectedPairId : report.nominated || report.state === 'succeeded');
              if (isActivePair) {
                const remoteCand = stats.get(report.remoteCandidateId);
                if (remoteCand?.candidateType === 'host') transportModeRef.current = 'webrtc-direct-lan';
                else if (remoteCand?.candidateType === 'relay') transportModeRef.current = 'webrtc-turn-relay';
                else transportModeRef.current = 'webrtc-direct-stun';
                setMetrics((prev) => ({
                  ...prev,
                  transport: transportModeRef.current,
                  iceCandidateType: remoteCand?.candidateType || null,
                }));
              }
            });
          } catch {}
        } else if (s === 'failed' || s === 'disconnected') {
          if (settingsRef.current.preferredTransport !== 'webrtc-only') {
            if (iceFallbackTimerRef.current) {
              clearTimeout(iceFallbackTimerRef.current);
              iceFallbackTimerRef.current = null;
            }
            transportModeRef.current = 'ws-encrypted-relay';
            setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
            addLog('warn', 'Direct WebRTC failed/disconnected; switched to E2E encrypted relay fallback');
            if (roleRef.current === 'sender' && (stateRef.current === 'CONNECTING' || stateRef.current === 'AUTHENTICATING' || stateRef.current === 'PEER_DETECTED' || stateRef.current === 'AWAITING_ACCEPTANCE')) {
              await sendManifestWhenReady();
            } else {
              await sendControlMessage({ type: 'TRANSPORT_SWITCH', transport: 'ws-encrypted-relay' });
            }
          } else {
            failWith(
              'TRANSPORT_FAILED',
              'Direct WebRTC ICE negotiation failed and relay fallback is disabled.'
            );
          }
        }
      };

      iceFallbackTimerRef.current = setTimeout(async () => {
        const dcOpen = controlChannelRef.current?.readyState === 'open';
        const stillNegotiating =
          stateRef.current === 'CONNECTING' ||
          stateRef.current === 'AUTHENTICATING' ||
          stateRef.current === 'PEER_DETECTED' ||
          stateRef.current === 'AWAITING_ACCEPTANCE';
        if (!dcOpen && stillNegotiating && settingsRef.current.preferredTransport !== 'webrtc-only') {
          transportModeRef.current = 'ws-encrypted-relay';
          setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
          addLog('warn', 'Direct WebRTC timed out; switched to E2E encrypted relay fallback');
          if (roleRef.current === 'sender' && (stateRef.current === 'CONNECTING' || stateRef.current === 'AUTHENTICATING' || stateRef.current === 'PEER_DETECTED' || stateRef.current === 'AWAITING_ACCEPTANCE')) {
            await sendManifestWhenReady();
          } else {
            await sendControlMessage({ type: 'TRANSPORT_SWITCH', transport: 'ws-encrypted-relay' });
          }
        }
      }, 2500);

      try {
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (signalingRef.current?.isOpen()) {
            await signalingRef.current.send({
              type: 'signal:relay',
              signalType: 'offer',
              payload: pc.localDescription,
            });
          }
          if (pendingAnswerRef.current) {
            const ans = pendingAnswerRef.current;
            pendingAnswerRef.current = null;
            await pc.setRemoteDescription(new RTCSessionDescription(ans));
            await flushPendingIce(pc);
          }
        } else if (pendingOfferRef.current) {
          const offer = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await flushPendingIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (signalingRef.current?.isOpen()) {
            await signalingRef.current.send({
              type: 'signal:relay',
              signalType: 'answer',
              payload: pc.localDescription,
            });
          }
        }
      } catch (err) {
        addLog('warn', 'WebRTC negotiation error', err instanceof Error ? err.message : undefined);
        if (settingsRef.current.preferredTransport !== 'webrtc-only') {
          transportModeRef.current = 'ws-encrypted-relay';
          setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
          if (roleRef.current === 'sender') {
            await sendManifestWhenReady();
          }
        } else {
          failWith('TRANSPORT_FAILED', 'WebRTC SDP negotiation failed.');
        }
      }
    },
    [
      addLog,
      failWith,
      flushPendingIce,
      handleControlMessage,
      handleIncomingBinaryChunk,
      sendManifestWhenReady,
      transitionState,
    ]
  );

  const handleSignalingServerMessage = useCallback(
    async (msg: Record<string, unknown>, transport: SignalingTransport) => {
      const type = typeof msg.type === 'string' ? msg.type : '';
      switch (type) {
        case 'pong':
          break;

        case 'discovery:sessions':
          setDiscoverableSessions((msg.sessions as DiscoverableSession[]) || []);
          break;

        case 'session:created':
          sessionIdRef.current = String(msg.sessionId);
          setSessionId(String(msg.sessionId));
          setPairingCode(String(msg.pairingCode));
          setPairingExpiresAt(Number(msg.expiresAt));
          transitionState('WAITING_FOR_PEER');
          break;

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
          const signalType = msg.signalType;
          if (!pc) {
            if (signalType === 'offer') {
              pendingOfferRef.current = msg.payload as RTCSessionDescriptionInit;
            } else if (signalType === 'answer') {
              pendingAnswerRef.current = msg.payload as RTCSessionDescriptionInit;
            } else if (signalType === 'ice-candidate' && msg.payload) {
              pendingIceCandidatesRef.current.push(msg.payload as RTCIceCandidateInit);
            }
            return;
          }
          try {
            if (signalType === 'offer') {
              await pc.setRemoteDescription(
                new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit)
              );
              await flushPendingIce(pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await transport.send({
                type: 'signal:relay',
                signalType: 'answer',
                payload: pc.localDescription,
              });
            } else if (signalType === 'answer') {
              await pc.setRemoteDescription(
                new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit)
              );
              await flushPendingIce(pc);
            } else if (signalType === 'ice-candidate' && msg.payload) {
              if (!pc.remoteDescription) {
                pendingIceCandidatesRef.current.push(msg.payload as RTCIceCandidateInit);
              } else {
                await pc.addIceCandidate(new RTCIceCandidate(msg.payload as RTCIceCandidateInit));
              }
            }
          } catch {}
          break;
        }

        case 'relay:packet': {
          const key = aesKeyRef.current;
          if (!key) return;
          if (transportModeRef.current === 'unavailable') {
            transportModeRef.current = 'ws-encrypted-relay';
            setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
          }
          try {
            const plain = await decryptRelayFrame(key, String(msg.iv), String(msg.ciphertext));
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
        case 'session:ended':
          if (stateRef.current !== 'COMPLETED' && stateRef.current !== 'IDLE') {
            failWith('TRANSPORT_FAILED', 'Remote peer disconnected from session.', true);
          }
          break;

        case 'session:expired':
          failWith('SESSION_EXPIRED', 'Pairing session expired after inactivity.');
          break;

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
    },
    [failWith, flushPendingIce, handleControlMessage, handleIncomingBinaryChunk, setupWebRTC, transitionState]
  );

  const connectHttpSignaling = useCallback(async (): Promise<SignalingTransport> => {
    const res = await fetch('/api/signaling/connect', { method: 'POST' });
    if (!res.ok) {
      throw new DropZeroError('NETWORK_UNAVAILABLE', 'Failed to reach HTTPS signaling endpoint');
    }
    const data = (await res.json()) as { ok?: boolean; clientId?: string };
    if (!data.ok || !data.clientId) {
      throw new DropZeroError('NETWORK_UNAVAILABLE', 'Invalid signaling handshake response');
    }

    const clientId = data.clientId;
    let active = true;
    const abortCtrl = new AbortController();

    const transport: SignalingTransport = {
      kind: 'http',
      isOpen: () => active,
      send: async (payload) => {
        if (!active) throw new DropZeroError('NETWORK_UNAVAILABLE', 'Signaling channel closed');
        const sendRes = await fetch('/api/signaling/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, message: payload }),
        });
        if (sendRes.status === 404) {
          active = false;
          if (signalingRef.current === transport) signalingRef.current = null;
          setSignalingConnected(false);
          throw new DropZeroError('NETWORK_UNAVAILABLE', 'Signaling session expired on server');
        }
        if (!sendRes.ok) {
          throw new DropZeroError('NETWORK_UNAVAILABLE', 'Failed sending signaling packet');
        }
      },
      close: () => {
        if (!active) return;
        active = false;
        abortCtrl.abort();
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon(
              '/api/signaling/disconnect',
              new Blob([JSON.stringify({ clientId })], { type: 'application/json' })
            );
          } else {
            void fetch('/api/signaling/disconnect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId }),
              keepalive: true,
            });
          }
        } catch {}
      },
    };

    signalingRef.current = transport;
    setSignalingConnected(true);
    addLog('info', 'Connected to DROPZERO signaling (HTTPS)');

    (async () => {
      while (active) {
        try {
          const pollRes = await fetch(
            `/api/signaling/poll?clientId=${encodeURIComponent(clientId)}`,
            { signal: abortCtrl.signal, cache: 'no-store' }
          );
          if (pollRes.status === 404) {
            active = false;
            if (signalingRef.current === transport) signalingRef.current = null;
            setSignalingConnected(false);
            break;
          }
          if (!pollRes.ok) {
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
          const payload = (await pollRes.json()) as {
            messages?: Array<Record<string, unknown>>;
          };
          if (Array.isArray(payload.messages)) {
            for (const msg of payload.messages) {
              await handleSignalingServerMessage(msg, transport);
            }
          }
        } catch (err) {
          if (!active || (err instanceof DOMException && err.name === 'AbortError')) break;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    })();

    await transport.send({ type: 'discovery:list' }).catch(() => {});
    return transport;
  }, [addLog, handleSignalingServerMessage]);

  const connectSignaling = useCallback((): Promise<SignalingTransport> => {
    if (signalingRef.current && signalingRef.current.isOpen()) {
      return Promise.resolve(signalingRef.current);
    }
    if (signalingConnectPromiseRef.current) {
      return signalingConnectPromiseRef.current;
    }

    const promise = (async (): Promise<SignalingTransport> => {
      const url = getSignalingWsUrl();
      if (url && typeof WebSocket !== 'undefined') {
        try {
          const wsTransport = await new Promise<SignalingTransport>((resolve, reject) => {
            const ws = new WebSocket(url);
            let settled = false;

            const timeout = setTimeout(() => {
              if (!settled) {
                settled = true;
                try {
                  ws.close();
                } catch {}
                reject(new Error('WS timeout'));
              }
            }, 2500);

            const transport: SignalingTransport = {
              kind: 'ws',
              isOpen: () => ws.readyState === WebSocket.OPEN,
              send: async (payload) => {
                if (ws.readyState !== WebSocket.OPEN) {
                  throw new DropZeroError('NETWORK_UNAVAILABLE', 'WebSocket not open');
                }
                ws.send(JSON.stringify(payload));
              },
              close: () => {
                try {
                  ws.close();
                } catch {}
              },
            };

            ws.onopen = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              signalingRef.current = transport;
              setSignalingConnected(true);
              addLog('info', 'Connected to DROPZERO signaling');
              ws.send(JSON.stringify({ type: 'discovery:list' }));
              resolve(transport);
            };

            ws.onerror = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              reject(new Error('WS error'));
            };

            ws.onclose = () => {
              if (!settled) {
                settled = true;
                clearTimeout(timeout);
                reject(new Error('WS closed'));
              }
              if (signalingRef.current === transport) {
                signalingRef.current = null;
                setSignalingConnected(false);
              }
            };

            ws.onmessage = async (event) => {
              if (typeof event.data !== 'string') return;
              try {
                const msg = JSON.parse(event.data) as Record<string, unknown>;
                await handleSignalingServerMessage(msg, transport);
              } catch {}
            };
          });
          return wsTransport;
        } catch {
          // Proxy or firewall rejected WebSocket upgrade; transparently switch to HTTPS long-poll
        }
      }

      return await connectHttpSignaling();
    })().finally(() => {
      signalingConnectPromiseRef.current = null;
    });

    signalingConnectPromiseRef.current = promise;
    return promise;
  }, [addLog, connectHttpSignaling, handleSignalingServerMessage]);

  useEffect(() => {
    connectSignaling().catch(() => {});
    const pingTimer = setInterval(() => {
      if (signalingRef.current && signalingRef.current.isOpen()) {
        void signalingRef.current.send({ type: 'ping' }).catch(() => {});
      } else {
        connectSignaling().catch(() => {});
      }
    }, 25_000);
    return () => clearInterval(pingTimer);
  }, [connectSignaling]);

  const startSendSession = useCallback(async () => {
    if (selectedFilesRef.current.length === 0) {
      failWith('FILE_READ_FAILED', 'Select at least one file before starting a send session.');
      return;
    }
    if (!crypto?.subtle) {
      failWith(
        'UNSUPPORTED_PLATFORM',
        'WebCrypto ECDH requires HTTPS or localhost secure context.'
      );
      return;
    }
    teardownConnection(false);
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
      const sig = await connectSignaling();
      await sig.send({
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
      });
    } catch (err) {
      failWith(
        err instanceof DropZeroError ? err.code : 'NETWORK_UNAVAILABLE',
        err instanceof Error ? err.message : 'Unable to start send session'
      );
    }
  }, [connectSignaling, failWith, teardownConnection, transitionState]);

  const startReceiveSession = useCallback(async () => {
    if (!crypto?.subtle) {
      failWith(
        'UNSUPPORTED_PLATFORM',
        'WebCrypto ECDH requires HTTPS or localhost secure context.'
      );
      return;
    }
    teardownConnection(false);
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
      const sig = await connectSignaling();
      await sig.send({
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
      });
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
      if (!crypto?.subtle) {
        failWith(
          'UNSUPPORTED_PLATFORM',
          'WebCrypto ECDH requires HTTPS or localhost secure context.'
        );
        return;
      }

      teardownConnection(false);
      setError(null);
      setSasCode(null);
      setSasConfirmed(false);
      setRemotePeer(null);
      transportModeRef.current = 'unavailable';
      stateRef.current = 'IDLE';
      transitionState('CREATING_SESSION');

      try {
        const identity = await generateEphemeralIdentity();
        ephemeralRef.current = identity;
        const sig = await connectSignaling();
        await sig.send({
          type: 'session:join',
          pairingCode: code,
          device: {
            name: localDeviceRef.current.deviceName,
            type: localDeviceRef.current.deviceType,
            platform: localDeviceRef.current.platform,
            capabilities: localDeviceRef.current.capabilities,
          },
          publicKeyJwk: identity.publicKeyJwk,
        });
      } catch (err) {
        failWith(
          err instanceof DropZeroError ? err.code : 'NETWORK_UNAVAILABLE',
          err instanceof Error ? err.message : 'Unable to join session'
        );
      }
    },
    [connectSignaling, failWith, teardownConnection, transitionState]
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
    teardownConnection(false);
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
    teardownConnection(false);
  }, [sendControlMessage, teardownConnection, transitionState]);

  const switchToRelayFallback = useCallback(async () => {
    if (iceFallbackTimerRef.current) {
      clearTimeout(iceFallbackTimerRef.current);
      iceFallbackTimerRef.current = null;
    }
    transportModeRef.current = 'ws-encrypted-relay';
    setMetrics((prev) => ({ ...prev, transport: 'ws-encrypted-relay' }));
    addLog('info', 'Switched to E2E encrypted relay transport');
    if (
      roleRef.current === 'sender' &&
      (stateRef.current === 'CONNECTING' ||
        stateRef.current === 'AUTHENTICATING' ||
        stateRef.current === 'PEER_DETECTED')
    ) {
      await sendManifestWhenReady();
    } else if (roleRef.current === 'receiver') {
      await sendControlMessage({ type: 'TRANSPORT_SWITCH', transport: 'ws-encrypted-relay' });
    }
  }, [addLog, sendControlMessage, sendManifestWhenReady]);

  const resetWorkspace = useCallback(() => {
    teardownConnection(false);
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
    const sig = signalingRef.current;
    if (sig && sig.isOpen()) {
      void sig.send({ type: 'discovery:list' }).catch(() => {});
      return;
    }
    connectSignaling()
      .then((transport) => {
        if (transport.isOpen()) {
          void transport.send({ type: 'discovery:list' }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [connectSignaling]);

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
  if (!ctx) throw new Error('useTransfer must be used within TransferProvider');
  return ctx;
}
