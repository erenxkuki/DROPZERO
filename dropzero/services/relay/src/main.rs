use dz_relay::SealedRelayPacket;

pub fn validate_opaque_packet(packet: &SealedRelayPacket) -> bool {
    !packet.ciphertext.is_empty() && packet.seq > 0
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("DROPZERO opaque E2E relay forwarder initialized");
}
