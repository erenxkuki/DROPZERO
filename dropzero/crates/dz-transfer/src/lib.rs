use dz_integrity::{hash_chunk, verify_chunk, IntegrityError, StreamingVerifier};
use dz_protocol::{ChunkFrame, TransferState};
use dz_telemetry::TransferMetrics;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TransferError {
    #[error("integrity failure: {0}")]
    Integrity(#[from] IntegrityError),
    #[error("storage failure: {0}")]
    Storage(#[from] dz_storage::StorageError),
    #[error("protocol failure: {0}")]
    Protocol(#[from] dz_protocol::ProtocolError),
}

pub struct ChunkPipeline {
    pub state: TransferState,
    pub metrics: TransferMetrics,
    verifier: StreamingVerifier,
}

impl ChunkPipeline {
    pub fn new(total_bytes: u64, active_chunk_size: u32) -> Self {
        Self {
            state: TransferState::Transferring,
            metrics: TransferMetrics {
                total_bytes,
                active_chunk_size,
                ..Default::default()
            },
            verifier: StreamingVerifier::new(),
        }
    }

    pub fn build_frame(file_index: u32, chunk_index: u32, payload: &[u8]) -> ChunkFrame {
        let digest = hash_chunk(payload);
        ChunkFrame {
            file_index,
            chunk_index,
            flags: 0,
            blake3_digest: digest,
            payload: payload.to_vec(),
        }
    }

    pub fn ingest_frame(&mut self, frame: &ChunkFrame) -> Result<(), TransferError> {
        verify_chunk(&frame.payload, &frame.blake3_digest)?;
        self.verifier.update(&frame.payload);
        self.metrics.record_bytes(frame.payload.len() as u64, 0.1);
        Ok(())
    }

    pub fn finalize_root(&mut self, expected_hex: &str) -> Result<String, TransferError> {
        self.state = TransferState::Verifying;
        let hex = self.verifier.verify_hex(expected_hex)?;
        self.state = TransferState::Completed;
        Ok(hex)
    }
}
