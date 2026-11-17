# DROPZERO Security Model

## Cryptographic Primitives

- **Key Agreement**: Ephemeral ECDH P-256 (WebCrypto) / X25519 (`x25519-dalek` in Rust). Fresh keypair per session; private key never persists to disk.
- **Key Derivation**: HKDF-SHA256 keyed with shared secret and salted with `sessionId` to derive:
  - AES-256-GCM / ChaCha20-Poly1305 session cipher key (`dropzero-session-key-v1`).
  - Independent 6-digit Short Authentication String (`dropzero-sas-v1`).
- **Payload Integrity**: Streaming per-chunk and whole-file BLAKE3 digests.
- **Path Sanitization**: Strips control chars, `..` traversal segments, leading slashes, and Windows drive prefixes (`sanitizeRelativePath`).

## Threat Boundaries

- The signaling server cannot decrypt `relay:packet` frames or impersonate peers silently when users verify the 6-digit SAS code.
- Explicit receiver acceptance prevents unsolicited file drops.
