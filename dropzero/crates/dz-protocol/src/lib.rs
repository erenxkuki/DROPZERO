use bytes::{Buf, BufMut, BytesMut};
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const PROTOCOL_VERSION: &str = "dz-p2p/1.0";
pub const FRAME_HEADER_LEN: usize = 48;

#[derive(Debug, Error)]
pub enum ProtocolError {
    #[error("frame too short: expected >= {FRAME_HEADER_LEN} bytes, got {0}")]
    TruncatedFrame(usize),
    #[error("payload length mismatch: declared {declared}, actual {actual}")]
    PayloadLengthMismatch { declared: usize, actual: usize },
    #[error("invalid FSM state transition from {from:?} to {to:?}")]
    InvalidTransition { from: TransferState, to: TransferState },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TransferState {
    Idle,
    SelectingFiles,
    CreatingSession,
    WaitingForPeer,
    PeerDetected,
    Authenticating,
    AwaitingAcceptance,
    Connecting,
    Transferring,
    Paused,
    Verifying,
    Completed,
    Failed,
    Cancelled,
    Recovering,
}

impl TransferState {
    pub fn can_transition(self, next: TransferState) -> bool {
        if self == next {
            return true;
        }
        use TransferState::*;
        matches!(
            (self, next),
            (Idle, SelectingFiles | CreatingSession | Connecting)
                | (SelectingFiles, Idle | CreatingSession | WaitingForPeer | Connecting)
                | (CreatingSession, WaitingForPeer | Failed | Cancelled | Idle)
                | (WaitingForPeer, PeerDetected | Cancelled | Failed | Idle)
                | (PeerDetected, Authenticating | Failed | Cancelled)
                | (Authenticating, AwaitingAcceptance | Connecting | Failed | Cancelled)
                | (AwaitingAcceptance, Connecting | Transferring | Cancelled | Failed)
                | (Connecting, AwaitingAcceptance | Transferring | Recovering | Failed | Cancelled)
                | (Transferring, Paused | Verifying | Recovering | Failed | Cancelled)
                | (Paused, Transferring | Recovering | Cancelled | Failed)
                | (Verifying, Completed | Failed | Cancelled)
                | (Completed, Idle | SelectingFiles | CreatingSession)
                | (Failed, Idle | SelectingFiles | Recovering | CreatingSession)
                | (Cancelled, Idle | SelectingFiles | CreatingSession)
                | (Recovering, Transferring | Verifying | Failed | Cancelled)
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileManifestEntry {
    pub index: u32,
    pub name: String,
    pub relative_path: String,
    pub size: u64,
    pub chunk_size: u32,
    pub total_chunks: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferManifest {
    pub protocol_version: String,
    pub session_id: String,
    pub sender_name: String,
    pub total_bytes: u64,
    pub files: Vec<FileManifestEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChunkFrame {
    pub file_index: u32,
    pub chunk_index: u32,
    pub flags: u32,
    pub blake3_digest: [u8; 32],
    pub payload: Vec<u8>,
}

impl ChunkFrame {
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = BytesMut::with_capacity(FRAME_HEADER_LEN + self.payload.len());
        buf.put_u32(self.file_index);
        buf.put_u32(self.chunk_index);
        buf.put_u32(self.payload.len() as u32);
        buf.put_u32(self.flags);
        buf.put_slice(&self.blake3_digest);
        buf.put_slice(&self.payload);
        buf.to_vec()
    }

    pub fn decode(raw: &[u8]) -> Result<Self, ProtocolError> {
        if raw.len() < FRAME_HEADER_LEN {
            return Err(ProtocolError::TruncatedFrame(raw.len()));
        }
        let mut cursor = &raw[..16];
        let file_index = cursor.get_u32();
        let chunk_index = cursor.get_u32();
        let payload_len = cursor.get_u32() as usize;
        let flags = cursor.get_u32();

        let mut blake3_digest = [0u8; 32];
        blake3_digest.copy_from_slice(&raw[16..48]);

        let actual = raw.len() - FRAME_HEADER_LEN;
        if actual != payload_len {
            return Err(ProtocolError::PayloadLengthMismatch {
                declared: payload_len,
                actual,
            });
        }

        Ok(Self {
            file_index,
            chunk_index,
            flags,
            blake3_digest,
            payload: raw[48..].to_vec(),
        })
    }
}

pub fn select_initial_chunk_size(total_file_size: u64, relay_mode: bool) -> u32 {
    if relay_mode {
        return 128 * 1024;
    }
    if total_file_size >= 512 * 1024 * 1024 {
        4 * 1024 * 1024
    } else if total_file_size >= 32 * 1024 * 1024 {
        1024 * 1024
    } else {
        256 * 1024
    }
}
