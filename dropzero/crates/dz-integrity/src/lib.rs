use thiserror::Error;

#[derive(Debug, Error)]
pub enum IntegrityError {
    #[error("BLAKE3 chunk digest mismatch")]
    ChunkDigestMismatch,
    #[error("BLAKE3 full-file root mismatch: expected {expected}, computed {computed}")]
    FileDigestMismatch { expected: String, computed: String },
}

pub fn hash_chunk(bytes: &[u8]) -> [u8; 32] {
    *blake3::hash(bytes).as_bytes()
}

pub fn verify_chunk(bytes: &[u8], expected: &[u8; 32]) -> Result<(), IntegrityError> {
    let computed = hash_chunk(bytes);
    if &computed != expected {
        return Err(IntegrityError::ChunkDigestMismatch);
    }
    Ok(())
}

pub struct StreamingVerifier {
    hasher: blake3::Hasher,
}

impl StreamingVerifier {
    pub fn new() -> Self {
        Self {
            hasher: blake3::Hasher::new(),
        }
    }

    pub fn update(&mut self, data: &[u8]) {
        self.hasher.update(data);
    }

    pub fn finalize_hex(&self) -> String {
        self.hasher.finalize().to_hex().to_string()
    }

    pub fn verify_hex(&self, expected_hex: &str) -> Result<String, IntegrityError> {
        let computed = self.finalize_hex();
        if computed != expected_hex {
            return Err(IntegrityError::FileDigestMismatch {
                expected: expected_hex.to_string(),
                computed,
            });
        }
        Ok(computed)
    }
}

impl Default for StreamingVerifier {
    fn default() -> Self {
        Self::new()
    }
}
