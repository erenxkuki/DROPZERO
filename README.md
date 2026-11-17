# DROPZERO

**Transfer without limits.**
_Your devices. Your files. Your connection._

DROPZERO is a free, open-source, privacy-first peer-to-peer file-transfer platform across Web, Desktop (Tauri v2), and CLI (Rust). Files stream directly between peers with ephemeral ECDH encryption, 6-digit SAS verification, explicit receiver consent, and per-chunk + full-file BLAKE3 verification—zero mandatory accounts, zero ads, and zero cloud file storage.

## Core Principles

- **Zero Server File Storage**: Signaling exchanges pairing codes and ICE/SDP metadata only; file bytes never touch signaling disk or cloud buckets.
- **Cryptographic Verification**: Ephemeral ECDH P-256 (Web) / X25519 (Rust) + HKDF-SHA256 + 6-digit Short Authentication String (SAS).
- **Per-Chunk & Full-Stream Integrity**: 32-byte BLAKE3 digest in every 48-byte binary frame header plus full-file BLAKE3 root confirmation.
- **Honest Telemetry**: Real `RTCPeerConnection.getStats()` throughput, RTT, and active ICE path reporting.
- **Dual-Licensed**: MIT or Apache-2.0 (`LICENSE`).

## Quick Start (Web + Signaling Server)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in two browser windows or two devices on your network to pair and stream files directly.

## Modular Workspace Structure

- `/` — React 19 + TypeScript + Tailwind CSS v4 web workspace (`src/`) and Express + WebSocket signaling (`server.ts`).
- `/dropzero/` — Modular Rust Cargo workspace (`dz-core`, `dz-protocol`, `dz-security`, `dz-integrity`, `dz-quic`, `dz-transfer`, `apps/cli`, `apps/desktop/src-tauri`, `services/signaling`, `services/relay`).
- `/docs/` — Architecture, wire protocol, cryptography, privacy, performance, building, and testing specs.
