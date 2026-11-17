import { createBLAKE3 } from 'hash-wasm';

export async function hashBytesBlake3(data: Uint8Array): Promise<Uint8Array> {
  const hasher = await createBLAKE3();
  hasher.init();
  hasher.update(data);
  return hasher.digest('binary');
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
