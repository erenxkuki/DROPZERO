use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::path::Path;
use thiserror::Error;
use tokio::fs;

#[derive(Debug, Error)]
pub enum RecoveryError {
    #[error("checkpoint I/O failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("checkpoint decode failed: {0}")]
    Codec(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferCheckpoint {
    pub transfer_id: String,
    pub filename: String,
    pub total_bytes: u64,
    pub chunk_size: u32,
    pub total_chunks: u32,
    pub completed_chunks: BTreeSet<u32>,
}

impl TransferCheckpoint {
    pub fn missing_chunks(&self) -> Vec<u32> {
        (0..self.total_chunks)
            .filter(|idx| !self.completed_chunks.contains(idx))
            .collect()
    }

    pub async fn save_to(&self, path: &Path) -> Result<(), RecoveryError> {
        let json = serde_json::to_vec_pretty(self)?;
        fs::write(path, json).await?;
        Ok(())
    }

    pub async fn load_from(path: &Path) -> Result<Self, RecoveryError> {
        let data = fs::read(path).await?;
        Ok(serde_json::from_slice(&data)?)
    }
}
