# Contributing to DROPZERO

DROPZERO is dual-licensed under MIT or Apache-2.0 (`LICENSE`).

## Expectations

1. Keep `tsc --noEmit` and `npm run build` clean for web changes.
2. Keep `cargo clippy --workspace --all-targets` and `cargo test --workspace` clean for Rust workspace changes.
3. Never introduce cloud file persistence, mandatory login gates, or fabricated transfer telemetry.
