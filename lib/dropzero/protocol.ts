import { DropZeroSettings } from './types';

export const PROTOCOL_VERSION = '1.0.0';
export const FRAME_MAGIC = 0x445a; // 'DZ'
export const FRAME_HEADER_BYTES = 16;
export const BLAKE3_DIGEST_BYTES = 32;
export const TOTAL_ENVELOPE_OVERHEAD = FRAME_HEADER_BYTES + BLAKE3_DIGEST_BYTES;

// Experimental chunk size presets (bytes)
export const CHUNK_64K = 64 * 1024;
export const CHUNK_256K = 256 * 1024;
export const CHUNK_1M = 1024 * 1024;

export function selectInitialChunkSize(
  mode: DropZeroSettings['chunkSizeMode'],
  fileSize: number,
  isRelay: boolean
): number {
  if (mode === '256k') return isRelay ? CHUNK_256K : CHUNK_256K;
  if (mode === '1m') return isRelay ? CHUNK_256K : CHUNK_1M;
  if (mode === '4m') return isRelay ? CHUNK_256K : CHUNK_1M; // Browser WebRTC SCTP safe upper slice
  // Adaptive: scale reasonably to avoid excessive overhead on large files and avoid buffering stalls on relay
  if (isRelay) return CHUNK_64K;
  if (fileSize <= 512 * 1024) return CHUNK_64K;
  return CHUNK_256K;
}

export function encodeChunkFrame(
  fileIndex: number,
  chunkIndex: number,
  blake3Digest: Uint8Array,
  payload: Uint8Array,
  flags = 0
): Uint8Array {
  if (blake3Digest.length !== BLAKE3_DIGEST_BYTES) {
    throw new Error(`Invalid BLAKE3 digest length: ${blake3Digest.length}`);
  }
  const frame = new Uint8Array(TOTAL_ENVELOPE_OVERHEAD + payload.length);
  const view = new DataView(frame.buffer);
  view.setUint16(0, FRAME_MAGIC, false);
  view.setUint16(2, fileIndex, false);
  view.setUint32(4, chunkIndex, false);
  view.setUint32(8, payload.length, false);
  view.setUint16(12, flags, false);
  view.setUint16(14, 0, false); // reserved
  frame.set(blake3Digest, FRAME_HEADER_BYTES);
  frame.set(payload, TOTAL_ENVELOPE_OVERHEAD);
  return frame;
}

export interface DecodedChunkFrame {
  fileIndex: number;
  chunkIndex: number;
  flags: number;
  blake3Digest: Uint8Array;
  payload: Uint8Array;
}

export function decodeChunkFrame(raw: ArrayBuffer | Uint8Array): DecodedChunkFrame {
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  if (bytes.length < TOTAL_ENVELOPE_OVERHEAD) {
    throw new Error('Malformed chunk frame: shorter than header');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint16(0, false);
  if (magic !== FRAME_MAGIC) {
    throw new Error(`Invalid chunk frame magic: 0x${magic.toString(16)}`);
  }
  const fileIndex = view.getUint16(2, false);
  const chunkIndex = view.getUint32(4, false);
  const payloadLength = view.getUint32(8, false);
  const flags = view.getUint16(12, false);

  if (bytes.length !== TOTAL_ENVELOPE_OVERHEAD + payloadLength) {
    throw new Error('Malformed chunk frame: payload length mismatch');
  }

  return {
    fileIndex,
    chunkIndex,
    flags,
    blake3Digest: bytes.subarray(FRAME_HEADER_BYTES, TOTAL_ENVELOPE_OVERHEAD),
    payload: bytes.subarray(TOTAL_ENVELOPE_OVERHEAD),
  };
}
