# DROPZERO Architecture (`dz-p2p/1.0`)

## High-Level Topology

```
[Sender Browser / CLI] <-- WebSocket /ws/signaling --> [Ephemeral RAM Signaling] <-- [Receiver Browser / CLI]
         |                                                                                     |
         +===================== Direct WebRTC DataChannel (DTLS) or QUIC =====================+
         |                         (Encrypted Relay Fallback: AES-256-GCM)                     |
```

## Subsystems

1. **Signaling Plane (`server.ts`, `dropzero/services/signaling`)**:
   - Maintains 6-character pairing rooms solely in RAM with a 10-minute TTL (`DROPZERO_SESSION_TTL_MS`).
   - Relays public key JWKs, SDP offers/answers, ICE candidates, and sealed opaque fallback frames (`relay:packet`).
   - Enforces per-IP WebSocket message rate limits (`DROPZERO_MAX_SIGNALING_RATE`).
2. **Transfer Finite State Machine (`src/lib/dropzero/types.ts`, `dz-protocol`)**:
   - 15 validated states (`IDLE` through `COMPLETED`/`RECOVERING`) prevent out-of-order state mutation.
3. **Browser Engine (`src/lib/dropzero/transfer-context.tsx`)**:
   - Ephemeral WebCrypto ECDH P-256 + HKDF-SHA256 + `hash-wasm` streaming BLAKE3.
   - `bufferedAmountLowThreshold` flow control prevents heap spikes on high-rate chunks.
   - Local persistence in IndexedDB (`dropzero_local_v1`) for history, optional remembered peers, settings, and recovery checkpoints.
4. **Native Rust Core (`dropzero/crates/dz-*`)**:
   - 14 modular crates sharing the exact 48-byte binary frame format and FSM transitions.
