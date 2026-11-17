# DROPZERO Wire Protocol (`dz-p2p/1.0`)

## Binary Chunk Frame Layout (48-Byte Header)

Every binary payload sent across `dropzero-data` (WebRTC), QUIC streams, or encrypted relay fallback uses a fixed big-endian 48-byte header:

| Offset | Length | Field | Description |
| --- | --- | --- | --- |
| `0` | 4 | `fileIndex` | Zero-based file index in `TransferManifest` |
| `4` | 4 | `chunkIndex` | Zero-based chunk index inside the file |
| `8` | 4 | `payloadLen` | Byte length of chunk payload following header |
| `12` | 4 | `flags` | Bitmask (`0` standard, `1` final chunk marker) |
| `16` | 32 | `blake3Digest` | Raw 32-byte BLAKE3 hash of `payload` |
| `48` | `N` | `payload` | Raw file slice bytes |

## Control Channel Messages (`dropzero-control`)

- `TRANSFER_MANIFEST`: Metadata list (sanitized names, relative paths, sizes, chunk sizes, chunk counts).
- `ACCEPT_TRANSFER` / `REJECT_TRANSFER`: Explicit receiver consent gate.
- `FILE_COMPLETE`: Full-file 64-char hex BLAKE3 digest emitted after final chunk.
- `ALL_VERIFIED`: Receiver confirmation after whole-stream hash match.
- `PAUSE_TRANSFER` / `RESUME_TRANSFER` / `CANCEL_TRANSFER` / `INTEGRITY_ERROR`.
