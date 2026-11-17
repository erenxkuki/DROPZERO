# DROPZERO Performance & Reliability Test Plan

Benchmark targets (run locally with Rust 1.82+ installed):

1. LAN QUIC throughput saturation (`1 GiB` sequential chunk benchmark)
2. Backpressure watermark stability (`HIGH_WATERMARK_BYTES = 1.5 MiB`, `LOW_WATERMARK_BYTES = 512 KiB`)
3. BLAKE3 streaming throughput parity across 256 KiB, 1 MiB, and 4 MiB chunks
4. Resumable checkpoint recovery after simulated peer drop at chunk 50%

Run workspace checks locally:

```bash
cd dropzero
cargo test --workspace
```
