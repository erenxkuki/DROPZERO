# Building DROPZERO

## Web Application & Signaling Server (Node 22+)

```bash
npm install
npm run lint     # tsc --noEmit
npm run build    # vite build -> dist/
npm run start    # NODE_ENV=production tsx server.ts on port 3000
```

Configure optional variables using `.env.example` (`VITE_DROPZERO_SIGNALING_URL`, `VITE_DROPZERO_STUN_URL`, `VITE_DROPZERO_REPO_URL`, `DROPZERO_SESSION_TTL_MS`, `DROPZERO_MAX_SIGNALING_RATE`).

## Rust Workspace, CLI & Tauri v2 Desktop (Rust 1.82+)

> Note: Building the Rust workspace requires a local or CI toolchain matching `dropzero/rust-toolchain.toml` (`rustc 1.82.0+` and `cargo`).

```bash
cd dropzero
cargo build --workspace
cargo build --release -p dropzero-cli
```

For Tauri v2 desktop packaging (`dropzero/apps/desktop/src-tauri`):

```bash
npm run build
cd dropzero/apps/desktop
cargo tauri build
```
