use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EphemeralRoom {
    pub session_id: String,
    pub pairing_code: String,
    pub expires_at_ms: u64,
    pub discoverable: bool,
}

#[derive(Default)]
pub struct RoomRegistry {
    rooms: Arc<RwLock<HashMap<String, EphemeralRoom>>>,
}

impl RoomRegistry {
    pub async fn create_room(&self, pairing_code: String, ttl_ms: u64, discoverable: bool) -> EphemeralRoom {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let room = EphemeralRoom {
            session_id: uuid::Uuid::new_v4().to_string(),
            pairing_code: pairing_code.clone(),
            expires_at_ms: now + ttl_ms,
            discoverable,
        };
        self.rooms.write().await.insert(pairing_code, room.clone());
        room
    }

    pub async fn prune_expired(&self) -> usize {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let mut guard = self.rooms.write().await;
        let before = guard.len();
        guard.retain(|_, room| room.expires_at_ms > now);
        before - guard.len()
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let registry = RoomRegistry::default();
    let room = registry.create_room("DZ0001".to_string(), 600_000, false).await;
    tracing::info!(session_id = %room.session_id, "DROPZERO Rust signaling service initialized");
}
