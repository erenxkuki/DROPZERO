use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid chunk size {0}: must be between 65536 and 16777216 bytes")]
    InvalidChunkSize(usize),
    #[error("signaling URL cannot be empty")]
    EmptySignalingUrl,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TransportPreference {
    Auto,
    QuicDirect,
    WebRtcOnly,
    RelayFallback,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DropZeroConfig {
    pub device_name: String,
    pub signaling_url: String,
    pub stun_server: String,
    pub default_chunk_size: usize,
    pub max_concurrent_files: usize,
    pub session_ttl_secs: u64,
    pub require_explicit_accept: bool,
    pub transport_preference: TransportPreference,
}

impl Default for DropZeroConfig {
    fn default() -> Self {
        Self {
            device_name: "DropZero Rust Node".to_string(),
            signaling_url: "ws://127.0.0.1:3000/ws/signaling".to_string(),
            stun_server: "stun.l.google.com:19302".to_string(),
            default_chunk_size: 256 * 1024,
            max_concurrent_files: 2,
            session_ttl_secs: 600,
            require_explicit_accept: true,
            transport_preference: TransportPreference::Auto,
        }
    }
}

impl DropZeroConfig {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.signaling_url.trim().is_empty() {
            return Err(ConfigError::EmptySignalingUrl);
        }
        if !(65_536..=16_777_216).contains(&self.default_chunk_size) {
            return Err(ConfigError::InvalidChunkSize(self.default_chunk_size));
        }
        Ok(())
    }
}
