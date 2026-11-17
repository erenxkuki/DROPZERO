import { createBLAKE3 } from 'hash-wasm';

export async function hashBytesBlake3(data: Uint8Array): Promise<Uint8Array> {
  const hasher = await createBLAKE3();
  hasher.init();
  hasher.update(data);
  return hasher.digest('binary');
}

export async function hashBytesBlake3Hex(data: Uint8Array): Promise<string> {
  const hasher = await createBLAKE3();
  hasher.init();
  hasher.update(data);
  return hasher.digest('hex');
}

export async function hashFileStreamingBlake3(
  file: File,
  onProgress?: (hashedBytes: number) => void
): Promise<string> {
  const hasher = await createBLAKE3();
  hasher.init();
  const sliceSize = 1024 * 1024; // 1 MiB bounded read window
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + sliceSize, file.size);
    const buffer = await file.slice(offset, end).arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset = end;
    if (onProgress) {
      onProgress(offset);
    }
  }

  return hasher.digest('hex');
}

export class StreamingFileHasher {
  private hasher: Awaited<ReturnType<typeof createBLAKE3>> | null = null;

  async init() {
    this.hasher = await createBLAKE3();
    this.hasher.init();
  }

  update(chunk: Uint8Array) {
    if (!this.hasher) {
      throw new Error('StreamingFileHasher not initialized');
    }
    this.hasher.update(chunk);
  }

  digestHex(): string {
    if (!this.hasher) {
      throw new Error('StreamingFileHasher not initialized');
    }
    return this.hasher.digest('hex');
  }
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
