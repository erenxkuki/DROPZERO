use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TransferMetrics {
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub smoothed_bps: Option<f64>,
    pub average_bps: Option<f64>,
    pub peak_bps: Option<f64>,
    pub rtt_ms: Option<u32>,
    pub active_chunk_size: u32,
}

impl TransferMetrics {
    pub fn record_bytes(&mut self, delta: u64, elapsed_secs: f64) {
        self.bytes_transferred += delta;
        if elapsed_secs > 0.0 {
            let instant = (delta as f64) / elapsed_secs;
            self.smoothed_bps = Some(match self.smoothed_bps {
                Some(prev) => prev * 0.65 + instant * 0.35,
                None => instant,
            });
            self.peak_bps = Some(self.peak_bps.map_or(instant, |p| p.max(instant)));
        }
    }
}
