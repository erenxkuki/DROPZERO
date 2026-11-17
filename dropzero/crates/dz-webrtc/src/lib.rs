use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "signalType", content = "payload")]
pub enum WebRtcSignal {
    Offer(serde_json::Value),
    Answer(serde_json::Value),
    IceCandidate(serde_json::Value),
}

pub const DATA_CHANNEL_CONTROL: &str = "dropzero-control";
pub const DATA_CHANNEL_DATA: &str = "dropzero-data";
pub const HIGH_WATERMARK_BYTES: usize = 1_572_864;
pub const LOW_WATERMARK_BYTES: usize = 524_288;
