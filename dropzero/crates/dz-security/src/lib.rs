use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Nonce,
};
use hkdf::Hkdf;
use rand::{rngs::OsRng, RngCore};
use sha2::{Digest, Sha256};
use thiserror::Error;
use x25519_dalek::{EphemeralSecret, PublicKey};

#[derive(Debug, Error)]
pub enum SecurityError {
    #[error("invalid peer key length: expected 32 bytes")]
    InvalidPeerKeyLength,
    #[error("AEAD encryption or decryption failed")]
    AeadFailed,
    #[error("rejected unsafe relative path: {0}")]
    UnsafePath(String),
}

pub struct EphemeralIdentity {
    secret: EphemeralSecret,
    pub public_bytes: [u8; 32],
}

impl EphemeralIdentity {
    pub fn generate() -> Self {
        let secret = EphemeralSecret::random_from_rng(OsRng);
        let public = PublicKey::from(&secret);
        Self {
            secret,
            public_bytes: *public.as_bytes(),
        }
    }

    pub fn derive_session(
        self,
        peer_public_bytes: &[u8],
        session_id: &str,
    ) -> Result<SessionCipher, SecurityError> {
        if peer_public_bytes.len() != 32 {
            return Err(SecurityError::InvalidPeerKeyLength);
        }
        let mut peer_arr = [0u8; 32];
        peer_arr.copy_from_slice(peer_public_bytes);
        let peer_pub = PublicKey::from(peer_arr);
        let shared = self.secret.diffie_hellman(&peer_pub);

        let hk = Hkdf::<Sha256>::new(Some(session_id.as_bytes()), shared.as_bytes());
        let mut key_bytes = [0u8; 32];
        hk.expand(b"dropzero-session-key-v1", &mut key_bytes)
            .map_err(|_| SecurityError::AeadFailed)?;

        let mut sas_bytes = [0u8; 4];
        hk.expand(b"dropzero-sas-v1", &mut sas_bytes)
            .map_err(|_| SecurityError::AeadFailed)?;
        let sas_num = u32::from_be_bytes(sas_bytes) % 1_000_000;
        let sas_code = format!("{:06}", sas_num);

        let mut fp_hash = Sha256::new();
        fp_hash.update(peer_public_bytes);
        let fp = hex::encode(&fp_hash.finalize()[..8]);

        Ok(SessionCipher {
            key: key_bytes,
            sas_code,
            peer_fingerprint: fp,
        })
    }
}

pub struct SessionCipher {
    key: [u8; 32],
    pub sas_code: String,
    pub peer_fingerprint: String,
}

impl SessionCipher {
    pub fn seal(&self, plaintext: &[u8]) -> Result<(Vec<u8>, [u8; 12]), SecurityError> {
        let cipher = ChaCha20Poly1305::new((&self.key).into());
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ct = cipher
            .encrypt(nonce, plaintext)
            .map_err(|_| SecurityError::AeadFailed)?;
        Ok((ct, nonce_bytes))
    }

    pub fn open(&self, ciphertext: &[u8], nonce_bytes: &[u8; 12]) -> Result<Vec<u8>, SecurityError> {
        let cipher = ChaCha20Poly1305::new((&self.key).into());
        let nonce = Nonce::from_slice(nonce_bytes);
        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| SecurityError::AeadFailed)
    }
}

pub fn generate_pairing_code() -> String {
    const ALPHABET: &[u8] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let mut rnd = [0u8; 6];
    OsRng.fill_bytes(&mut rnd);
    rnd.iter()
        .map(|b| ALPHABET[(*b as usize) % ALPHABET.len()] as char)
        .collect()
}

pub fn sanitize_relative_path(raw: &str) -> Result<String, SecurityError> {
    let normalized = raw.replace('\\', "/");
    let parts: Vec<&str> = normalized
        .split('/')
        .filter(|seg| !seg.is_empty() && *seg != ".")
        .collect();
    if parts.is_empty() || parts.iter().any(|seg| *seg == ".." || seg.contains(':')) {
        return Err(SecurityError::UnsafePath(raw.to_string()));
    }
    Ok(parts.join("/"))
}
