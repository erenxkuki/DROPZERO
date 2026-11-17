use dz_core::protocol::{ChunkFrame, TransferState};
use dz_core::relay::{open_relay_payload, seal_relay_payload};
use dz_core::security::{sanitize_relative_path, EphemeralIdentity};
use dz_core::transfer::ChunkPipeline;

#[test]
fn fsm_enforces_receiver_acceptance() {
    assert!(TransferState::Authenticating.can_transition(TransferState::AwaitingAcceptance));
    assert!(TransferState::AwaitingAcceptance.can_transition(TransferState::Transferring));
    assert!(!TransferState::Idle.can_transition(TransferState::Completed));
}

#[test]
fn x25519_sas_and_blake3_chunk_roundtrip() {
    let sender = EphemeralIdentity::generate();
    let receiver = EphemeralIdentity::generate();
    let sender_pub = sender.public_bytes;
    let receiver_pub = receiver.public_bytes;

    let tx_cipher = sender.derive_session(&receiver_pub, "sess-1").unwrap();
    let rx_cipher = receiver.derive_session(&sender_pub, "sess-1").unwrap();

    assert_eq!(tx_cipher.sas_code, rx_cipher.sas_code);

    let payload = b"dropzero binary chunk verification test payload";
    let frame = ChunkPipeline::build_frame(0, 0, payload);
    let encoded = frame.encode();
    let sealed = seal_relay_payload(&tx_cipher, 1, &encoded).unwrap();
    let opened = open_relay_payload(&rx_cipher, &sealed).unwrap();
    let decoded = ChunkFrame::decode(&opened).unwrap();

    let mut pipeline = ChunkPipeline::new(payload.len() as u64, 256 * 1024);
    pipeline.ingest_frame(&decoded).unwrap();
    let expected_root = blake3::hash(payload).to_hex().to_string();
    let actual_root = pipeline.finalize_root(&expected_root).unwrap();
    assert_eq!(actual_root, expected_root);
}

#[test]
fn rejects_path_traversal() {
    assert!(sanitize_relative_path("../etc/passwd").is_err());
    assert!(sanitize_relative_path("C:\\Windows\\System32").is_err());
    assert_eq!(
        sanitize_relative_path("assets/photo.png").unwrap(),
        "assets/photo.png"
    );
}
