use std::net::SocketAddr;
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum QuicError {
    #[error("TLS certificate generation error: {0}")]
    Cert(String),
    #[error("QUIC endpoint bind failed: {0}")]
    Io(#[from] std::io::Error),
}

pub fn build_self_signed_server_config() -> Result<(quinn::ServerConfig, Vec<u8>), QuicError> {
    let cert = rcgen::generate_simple_self_signed(vec!["dropzero.local".to_string()])
        .map_err(|e| QuicError::Cert(e.to_string()))?;
    let cert_der = cert.cert.der().to_vec();
    let key_der = rustls::pki_types::PrivatePkcs8KeyDer::from(cert.key_pair.serialize_der());

    let server_config = quinn::ServerConfig::with_single_certificate(
        vec![rustls::pki_types::CertificateDer::from(cert_der.clone())],
        key_der.into(),
    )
    .map_err(|e| QuicError::Cert(e.to_string()))?;

    Ok((server_config, cert_der))
}

pub async fn bind_quic_listener(addr: SocketAddr) -> Result<(quinn::Endpoint, Vec<u8>), QuicError> {
    let (cfg, cert_der) = build_self_signed_server_config()?;
    let endpoint = quinn::Endpoint::server(cfg, addr)?;
    Ok((endpoint, cert_der))
}

pub fn create_client_endpoint(bind_addr: SocketAddr) -> Result<quinn::Endpoint, QuicError> {
    let endpoint = quinn::Endpoint::client(bind_addr)?;
    Ok(endpoint)
}

pub fn protocol_alpn() -> Arc<[u8]> {
    Arc::from(dz_protocol::PROTOCOL_VERSION.as_bytes().to_vec())
}
