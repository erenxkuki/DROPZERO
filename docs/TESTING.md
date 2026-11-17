# Testing DROPZERO

## Web & Signaling Verification

```bash
npm run lint
npm run build
```

With the dev or production server running on port 3000:
- Health probe: `GET /api/health` returns `{ ok: true, service: "dropzero-signaling", uptimeMs, activeSessions, sessionTtlMs }`.
- Signaling handshake: WebSocket `/ws/signaling` creates 6-character rooms, pairs sender/receiver metadata, relays SDP/ICE/encrypted relay packets, and cleans up rooms on disconnect or TTL expiry.

## Rust Integration Suite

Run in an environment with Rust 1.82+ installed:

```bash
cd dropzero
cargo test --workspace
```

Covers 15-state FSM transition enforcement, X25519 + HKDF-SHA256 + 6-digit SAS derivation, 48-byte binary frame encoding/decoding, ChaCha20-Poly1305 encrypted relay roundtrip, BLAKE3 chunk + root verification, and path traversal rejection.
