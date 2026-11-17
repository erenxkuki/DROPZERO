# DROPZERO Performance Engineering

- **Adaptive Chunk Sizing**: Selects `256 KiB`, `1 MiB`, or `4 MiB` on direct WebRTC/QUIC links based on total payload size, and `128 KiB` over encrypted WebSocket relay fallback.
- **Backpressure Watermarks**: DataChannel writes pause automatically above `1.5 MiB` buffered bytes and resume on `bufferedamountlow` at `512 KiB`.
- **Zero Synthetic Numbers**: UI metrics reflect real byte counters, EWMA smoothed rates (`0.65 / 0.35`), and `RTCPeerConnection.getStats()` RTT / candidate reports.
