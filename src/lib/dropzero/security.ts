const PAIRING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const WINDOWS_RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export function generatePairingCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += PAIRING_ALPHABET[bytes[i] % PAIRING_ALPHABET.length];
  }
  return code;
}

export function sanitizeFilename(rawName: string): string {
  let name = rawName
    .replace(/\0/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/]+/g, '_')
    .replace(/[:*?"<>|]/g, '_')
    .trim();

  name = name.replace(/^\.+/, '').trim();
  if (!name || name === '.' || name === '..') {
    return 'unnamed_file';
  }

  const baseUpper = name.split('.')[0]?.toUpperCase() || '';
  if (WINDOWS_RESERVED.has(baseUpper)) {
    name = `_${name}`;
  }

  if (name.length > 200) {
    const extIdx = name.lastIndexOf('.');
    if (extIdx > 0 && name.length - extIdx <= 16) {
      const ext = name.slice(extIdx);
      name = `${name.slice(0, 200 - ext.length)}${ext}`;
    } else {
      name = name.slice(0, 200);
    }
  }

  return name;
}

export function sanitizeRelativePath(rawPath: string): string {
  const segments = rawPath
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.' && s !== '..');

  if (segments.length === 0) {
    return 'unnamed_file';
  }

  return segments.map((seg) => sanitizeFilename(seg)).join('/');
}

export interface EphemeralIdentity {
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}

export async function generateEphemeralIdentity(): Promise<EphemeralIdentity> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const fingerprint = await computePublicKeyFingerprint(publicKeyJwk);

  return { keyPair, publicKeyJwk, fingerprint };
}

export async function computePublicKeyFingerprint(jwk: JsonWebKey): Promise<string> {
  const canonical = JSON.stringify({
    crv: jwk.crv || '',
    kty: jwk.kty || '',
    x: jwk.x || '',
    y: jwk.y || '',
  });
  const encoded = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');
}

export interface DerivedSessionSecurity {
  aesKey: CryptoKey;
  sasCode: string;
  remoteFingerprint: string;
}

export async function deriveSessionSecurity(
  localPrivateKey: CryptoKey,
  localPublicKeyJwk: JsonWebKey,
  remotePublicKeyJwk: JsonWebKey,
  sessionId: string
): Promise<DerivedSessionSecurity> {
  const remotePublicKey = await crypto.subtle.importKey(
    'jwk',
    remotePublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: remotePublicKey },
    localPrivateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey', 'deriveBits']);
  const salt = new TextEncoder().encode(`dropzero-v1:${sessionId}`);

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('dropzero-relay-aes-gcm'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const localFp = await computePublicKeyFingerprint(localPublicKeyJwk);
  const remoteFingerprint = await computePublicKeyFingerprint(remotePublicKeyJwk);
  const sortedKeys = [localFp, remoteFingerprint].sort().join('|');
  const sasBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode(`dropzero-sas:${sortedKeys}`),
    },
    hkdfKey,
    32
  );
  const view = new DataView(sasBits);
  const numeric = view.getUint32(0, false) % 1_000_000;
  const sasCode = numeric.toString().padStart(6, '0');

  return { aesKey, sasCode, remoteFingerprint };
}

export async function encryptRelayFrame(
  aesKey: CryptoKey,
  plaintext: Uint8Array
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintext as BufferSource
  );
  return {
    iv: uint8ToBase64(iv),
    ciphertext: uint8ToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptRelayFrame(
  aesKey: CryptoKey,
  ivB64: string,
  ciphertextB64: string
): Promise<Uint8Array> {
  const iv = base64ToUint8(ivB64);
  const ciphertext = base64ToUint8(ciphertextB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    ciphertext as BufferSource
  );
  return new Uint8Array(decrypted);
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
