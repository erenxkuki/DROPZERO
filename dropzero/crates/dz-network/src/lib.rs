use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum TransportPath {
    QuicDirectLan,
    QuicDirectStun,
    WebRtcDirectLan,
    WebRtcDirectStun,
    TurnRelayE2E,
    WebSocketRelayE2E,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkCandidate {
    pub path: TransportPath,
    pub addr: SocketAddr,
    pub estimated_rtt_ms: Option<u32>,
}

pub fn select_best_candidate(candidates: &[NetworkCandidate]) -> Option<&NetworkCandidate> {
    candidates.iter().min_by_key(|c| (c.path, c.estimated_rtt_ms.unwrap_or(u32::MAX)))
}
