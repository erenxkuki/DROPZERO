import {
  DEFAULT_SETTINGS,
  DevicePlatform,
  DropZeroSettings,
  LocalDeviceIdentity,
  RecoveryCheckpoint,
  RememberedDevice,
  TransferHistoryEntry,
} from './types';

const DB_NAME = 'dropzero_local_v1';
const DB_VERSION = 1;
const STORE_HISTORY = 'history';
const STORE_DEVICES = 'devices';
const STORE_RECOVERY = 'recovery';
const STORE_SETTINGS = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB unavailable in this environment'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DEVICES)) {
        db.createObjectStore(STORE_DEVICES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECOVERY)) {
        db.createObjectStore(STORE_RECOVERY, { keyPath: 'transferId' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error(`IndexedDB error in ${storeName}`));
  });
}

// History
export async function getTransferHistory(): Promise<TransferHistoryEntry[]> {
  try {
    const rows = await withStore<TransferHistoryEntry[]>(STORE_HISTORY, 'readonly', (s) =>
      s.getAll()
    );
    return rows.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export async function addTransferHistory(entry: TransferHistoryEntry): Promise<void> {
  try {
    await withStore(STORE_HISTORY, 'readwrite', (s) => s.put(entry));
  } catch {
    // Graceful no-op if storage blocked
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    await withStore(STORE_HISTORY, 'readwrite', (s) => s.delete(id));
  } catch {
    // Graceful no-op
  }
}

export async function clearTransferHistory(): Promise<void> {
  try {
    await withStore(STORE_HISTORY, 'readwrite', (s) => s.clear());
  } catch {
    // Graceful no-op
  }
}

// Remembered devices (optional)
export async function getRememberedDevices(): Promise<RememberedDevice[]> {
  try {
    const rows = await withStore<RememberedDevice[]>(STORE_DEVICES, 'readonly', (s) => s.getAll());
    return rows.sort((a, b) => b.lastSessionAt - a.lastSessionAt);
  } catch {
    return [];
  }
}

export async function saveRememberedDevice(device: RememberedDevice): Promise<void> {
  try {
    await withStore(STORE_DEVICES, 'readwrite', (s) => s.put(device));
  } catch {
    // Graceful no-op
  }
}

export async function removeRememberedDevice(id: string): Promise<void> {
  try {
    await withStore(STORE_DEVICES, 'readwrite', (s) => s.delete(id));
  } catch {
    // Graceful no-op
  }
}

export async function clearRememberedDevices(): Promise<void> {
  try {
    await withStore(STORE_DEVICES, 'readwrite', (s) => s.clear());
  } catch {
    // Graceful no-op
  }
}

// Recovery checkpoints
export async function saveRecoveryCheckpoint(checkpoint: RecoveryCheckpoint): Promise<void> {
  try {
    await withStore(STORE_RECOVERY, 'readwrite', (s) => s.put(checkpoint));
  } catch {
    // Graceful no-op
  }
}

export async function getRecoveryCheckpoints(): Promise<RecoveryCheckpoint[]> {
  try {
    return await withStore<RecoveryCheckpoint[]>(STORE_RECOVERY, 'readonly', (s) => s.getAll());
  } catch {
    return [];
  }
}

export async function deleteRecoveryCheckpoint(transferId: string): Promise<void> {
  try {
    await withStore(STORE_RECOVERY, 'readwrite', (s) => s.delete(transferId));
  } catch {
    // Graceful no-op
  }
}

export async function clearRecoveryCheckpoints(): Promise<void> {
  try {
    await withStore(STORE_RECOVERY, 'readwrite', (s) => s.clear());
  } catch {
    // Graceful no-op
  }
}

// Settings
export async function getLocalSettings(): Promise<DropZeroSettings> {
  try {
    const row = await withStore<{ key: string; value: DropZeroSettings } | undefined>(
      STORE_SETTINGS,
      'readonly',
      (s) => s.get('user_settings')
    );
    if (!row?.value) {
      return { ...DEFAULT_SETTINGS, deviceName: detectDefaultDeviceName() };
    }
    return { ...DEFAULT_SETTINGS, ...row.value };
  } catch {
    return { ...DEFAULT_SETTINGS, deviceName: detectDefaultDeviceName() };
  }
}

export async function saveLocalSettings(settings: DropZeroSettings): Promise<void> {
  try {
    await withStore(STORE_SETTINGS, 'readwrite', (s) =>
      s.put({ key: 'user_settings', value: settings })
    );
  } catch {
    // Graceful no-op
  }
}

export function detectDevicePlatform(): {
  deviceType: DevicePlatform;
  platform: string;
} {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'Browser', platform: 'Web' };
  }
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return { deviceType: 'Android', platform: 'Android Browser' };
  if (/Mac OS X|Macintosh/i.test(ua)) return { deviceType: 'macOS', platform: 'macOS Browser' };
  if (/Windows/i.test(ua)) return { deviceType: 'Windows PC', platform: 'Windows Browser' };
  if (/Linux/i.test(ua)) return { deviceType: 'Linux PC', platform: 'Linux Browser' };
  return { deviceType: 'Browser', platform: 'Web Browser' };
}

export function detectDefaultDeviceName(): string {
  const { deviceType } = detectDevicePlatform();
  if (deviceType === 'Android') return 'Android Browser';
  if (deviceType === 'macOS') return 'Mac Workstation';
  if (deviceType === 'Windows PC') return 'Windows Browser';
  if (deviceType === 'Linux PC') return 'Linux Browser';
  return 'Web Browser';
}

export function getOrCreateLocalDeviceIdentity(customName?: string): LocalDeviceIdentity {
  const { deviceType, platform } = detectDevicePlatform();
  let deviceId = 'dz-web-ephemeral';
  if (typeof window !== 'undefined') {
    try {
      const existing = sessionStorage.getItem('dz_session_device_id');
      if (existing) {
        deviceId = existing;
      } else {
        deviceId = `dz-${crypto.randomUUID().slice(0, 8)}`;
        sessionStorage.setItem('dz_session_device_id', deviceId);
      }
    } catch {
      deviceId = `dz-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  const capabilities = ['webrtc', 'blake3'];
  if (typeof window !== 'undefined') {
    if ('showSaveFilePicker' in window) capabilities.push('fs-access');
    if ('indexedDB' in window) capabilities.push('recovery-idb');
  }

  return {
    deviceId,
    deviceName: customName?.trim() || detectDefaultDeviceName(),
    deviceType,
    platform,
    capabilities,
  };
}
