use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverableSession {
    pub pairing_code: String,
    pub mode: String,
    pub device_name: String,
    pub device_type: String,
    pub platform: String,
    pub expires_at_ms: u64,
}
