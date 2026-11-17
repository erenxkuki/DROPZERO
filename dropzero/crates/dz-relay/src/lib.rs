use dz_security::{SecurityError, SessionCipher};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SealedRelayPacket {
    pub seq: u64,
    pub nonce: [u8; 12],
    pub ciphertext: Vec<u8>,
}

pub fn seal_relay_payload(
    cipher: &SessionCipher,
    seq: u64,
    plaintext: &[u8],
) -> Result<SealedRelayPacket, SecurityError> {
    let (ciphertext, nonce) = cipher.seal(plaintext)?;
    Ok(SealedRelayPacket {
        seq,
        nonce,
        ciphertext,
    })
}

pub fn open_relay_payload(
    cipher: &SessionCipher,
    packet: &SealedRelayPacket,
) -> Result<Vec<u8>, SecurityError> {
    cipher.open(&packet.ciphertext, &packet.nonce)
}
