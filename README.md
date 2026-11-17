<div align="center">
  <img src="public/logo.svg" alt="DROPZERO Logo" width="88" height="88" />
  <h1>DROPZERO</h1>
  <p><strong>Transfer without limits.</strong><br />Your devices. Your files. Your connection.</p>
  <p>
    <a href="#quick-start">Quick Start</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#web-routes">Routes</a> ·
    <a href="#rust-workspace">Rust Workspace</a> ·
    <a href="#documentation">Documentation</a>
  </p>
</div>

---

**DROPZERO** is a free-forever, open-source, privacy-first peer-to-peer file-transfer platform across Web, Desktop (Tauri v2), and CLI (Rust). Files stream directly between peers with ephemeral ECDH cryptography, 6-digit Short Authentication String (SAS) verification, explicit receiver consent, and per-chunk + full-stream BLAKE3 verification — with **zero mandatory accounts, zero ads, and zero cloud file storage**.

## Core Guarantees

- **Zero Server File Storage**: The signaling server holds only ephemeral 6-character pairing rooms in RAM (default 10-minute TTL) and relays SDP/ICE metadata. File bytes never touch server disk or cloud storage.
- **Ephemeral End-to-End Cryptography**: Every pairing session generates fresh ephemeral keys (`ECDH P-256` in browser WebCrypto; `X25519` in Rust) fed through `HKDF-SHA256` to derive both an encryption key (`AES-256-GCM` / `ChaCha20-Poly1305`) and an independent **6-digit SAS code**.
- **Explicit Receiver Consent Gate**: Receiving peers inspect sender metadata, file names, sizes, and SAS code before accepting a transfer (`AWAITING_ACCEPTANCE`). Incoming relative paths are sanitized to block traversal attacks.
- **Per-Chunk & Whole-File BLAKE3 Verification**: Every 48-byte binary chunk frame carries a 32-byte BLAKE3 digest verified immediately on arrival (`hash-wasm` on Web, `blake3` in Rust), followed by a streaming full-file BLAKE3 root check.
- **Honest Transport & Telemetry**: Prioritizes Direct WebRTC LAN (`host`) → WebRTC STUN (`srflx`) → AES-256-GCM Encrypted WebSocket Relay Fallback. Live throughput, smoothed EWMA rate, peak rate, ETA, and RTT come directly from `RTCPeerConnection.getStats()`.
- **Local-Only Browser Persistence**: History, settings, recovery checkpoints, and optional remembered peer fingerprints are stored strictly in browser IndexedDB (`dropzero_local_v1`) with one-click wipe in Settings.

---

## Architecture

```text
+-----------------------+       WebSocket (/ws/signaling)       +-----------------------+
|   Sender Node         | <===================================> |   Signaling Server    |
|   Browser / Rust CLI  |   RAM-only Pairing Codes & SDP/ICE    |   server.ts / Rust    |
+-----------------------+                                       +-----------------------+
            ||                                                              ^
            ||  1. Direct WebRTC DataChannel (DTLS) / Native QUIC (TLS 1.3) |
            ||  2. Backpressure: bufferedAmountLowThreshold (512K - 1.5M)   |
            ||  3. Fallback: Client-sealed AES-256-GCM relay:packet ========+
            vv
+-----------------------+
|   Receiver Node       |   -> Verifies 6-digit SAS + File Manifest
|   Browser / Rust CLI  |   -> Verifies per-chunk & full-file BLAKE3
+-----------------------+   -> Saves locally with zero cloud upload
```

---

## Quick Start

### Web Application & Signaling Server (Node 22+)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in two browser windows or across two devices on your network to pair with a 6-character code or QR link and stream files directly.

| Script | Command | Purpose |
| --- | --- | --- |
| Development server | `npm run dev` | Runs `tsx server.ts` (Express + Vite middleware + `/ws/signaling`) on port `3000` |
| Type check | `npm run lint` | Runs `tsc --noEmit` across `src/`, `server.ts`, and `vite.config.ts` |
| Production build | `npm run build` | Compiles Vite production bundle into `dist/` |
| Production server | `npm run start` | Serves built `dist/` and `/ws/signaling` via `NODE_ENV=production tsx server.ts` |

### Health & Signaling Endpoints

- `GET /api/health` → `{ ok: true, service: "dropzero-signaling", uptimeMs, activeSessions, sessionTtlMs }`
- `WS /ws/signaling` → Handles `session:create`, `session:join`, `discovery:list`, `signal:relay`, `relay:packet`, `session:leave`, and `ping`.

---

## Environment Configuration

Copy `.env.example` when overriding defaults:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_DROPZERO_SIGNALING_URL` | Same-origin `/ws/signaling` | Optional override for WebSocket signaling endpoint |
| `VITE_DROPZERO_STUN_URL` | `stun:stun.l.google.com:19302` | STUN server used for ICE NAT traversal |
| `VITE_DROPZERO_REPO_URL` | `""` | Optional source/releases repository link displayed in UI |
| `DROPZERO_SESSION_TTL_MS` | `600000` | Ephemeral pairing session TTL in milliseconds (10 min) |
| `DROPZERO_MAX_SIGNALING_RATE` | `120` | Max WebSocket signaling messages per IP per minute |

---

## Web Routes

| Route | View | Description |
| --- | --- | --- |
| `/` | Home | Animated monochrome landing page with embedded live `TransferWidget` and transport visualizer |
| `/transfer` | Transfer Console | Full 3-column P2P workspace (supports `?pair=CODE`, folder drop, QR code, SAS check, diagnostics) |
| `/devices` | Devices | Local device node identity, active discoverable sessions, and optional locally remembered peers |
| `/history` | History | Browser IndexedDB transfer audit ledger filtered by All / Sent / Received |
| `/features` | Features | Adaptive chunking, backpressure, 15-state deterministic FSM, and transport fallback specs |
| `/security` | Security | ECDH P-256 / X25519 cryptography, HKDF-SHA256 SAS verification, and threat model |
| `/privacy` | Privacy | Zero-account, zero-analytics, zero-cloud-storage privacy commitments |
| `/about` | About | Project mission, open architecture, and MIT / Apache-2.0 engineering ethos |
| `/download` | Download | Browser client + Rust CLI & Tauri v2 desktop build instructions |
| `/settings` | Settings | Device label, dark/light/system theme, chunk strategy, `/api/health` probe, JSON export & wipe |

---

## Repository Structure & Rust Workspace

```text
.
├── index.html                  # App metadata, SVG favicon, OpenGraph tags
├── metadata.json               # DROPZERO app manifest
├── package.json                # dropzero v1.0.0 scripts & dependencies
├── server.ts                   # Express + Vite / dist server + WebSocket signaling & rate limiter
├── public/
│   ├── logo.svg                # Monochrome geometric DROPZERO brand mark
│   └── manifest.webmanifest    # PWA / Web App Manifest
├── src/
│   ├── App.tsx                 # MotionConfig, scroll progress bar, AnimatePresence router
│   ├── index.css               # Tailwind CSS v4 + light/dark CSS variables
│   ├── components/
│   │   ├── ui/                 # Monochrome design system primitives (Button, Input, Dialog, Tabs, etc.)
│   │   └── dropzero/           # Header, Footer, HeroVisual, TransferWidget, FileCard, DeviceCard, QRCodeDialog
│   ├── lib/dropzero/           # 15-state FSM types, ECDH security, BLAKE3 integrity, IndexedDB, WebRTC context
│   └── pages/                  # All 10 routed views
├── docs/                       # Technical & operational documentation
└── dropzero/                   # Modular Rust 1.82+ Cargo workspace
    ├── Cargo.toml
    ├── rust-toolchain.toml
    ├── crates/
    │   ├── dz-config           # Runtime & transport configuration validation
    │   ├── dz-protocol         # 15-state FSM & 48-byte binary ChunkFrame codec
    │   ├── dz-integrity        # BLAKE3 per-chunk & streaming full-file verification
    │   ├── dz-security         # X25519 ECDH, HKDF-SHA256, ChaCha20-Poly1305, SAS & path sanitization
    │   ├── dz-storage          # Safe path joining & random-access async chunk I/O
    │   ├── dz-recovery         # Transfer checkpoints & missing-chunk calculation
    │   ├── dz-network          # Candidate path prioritization (LAN -> STUN -> Relay)
    │   ├── dz-quic             # Quinn QUIC TLS 1.3 ALPN endpoints
    │   ├── dz-webrtc           # WebRTC signaling models & backpressure watermarks
    │   ├── dz-relay            # E2E sealed relay packet helpers
    │   ├── dz-discovery        # Discoverable room session models
    │   ├── dz-telemetry        # Throughput & RTT metrics accumulator
    │   ├── dz-transfer         # High-level chunk pipeline orchestrator
    │   └── dz-core             # Unified facade crate
    ├── apps/
    │   ├── cli                 # dropzero CLI binary (`send`, `receive`, `hash`)
    │   └── desktop/src-tauri   # Tauri v2 desktop wrapper
    ├── services/
    │   ├── signaling           # Rust ephemeral RAM-only signaling room registry
    │   └── relay               # Opaque ciphertext-only relay forwarder
    └── tests/
        ├── integration         # E2E X25519/SAS/BLAKE3/FSM protocol tests
        └── performance         # Throughput & recovery benchmark plan
```

### Building & Testing Rust Workspace (Requires Rust 1.82+)

```bash
cd dropzero
cargo build --workspace
cargo test --workspace
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System topology, signaling plane, and Rust/Web engine layers
- [`docs/PROTOCOL.md`](docs/PROTOCOL.md) — 48-byte binary chunk frame header and control channel specification
- [`docs/SECURITY.md`](docs/SECURITY.md) — Key agreement, 6-digit SAS verification, relay sealing, and threat boundaries
- [`docs/PRIVACY.md`](docs/PRIVACY.md) — Data minimization and local-only storage guarantees
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) — Adaptive chunk sizing, DataChannel backpressure, and telemetry
- [`docs/BUILDING.md`](docs/BUILDING.md) — Web, Node, CLI, and Tauri v2 build instructions
- [`docs/TESTING.md`](docs/TESTING.md) — Web verification, signaling probes, and Rust integration tests
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — Contribution guidelines

---

## License

Dual-licensed under **MIT OR Apache-2.0**. See [`LICENSE`](LICENSE) for full terms.
