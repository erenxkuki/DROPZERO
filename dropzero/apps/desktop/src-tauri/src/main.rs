use dz_core::config::DropZeroConfig;
use dz_core::protocol::PROTOCOL_VERSION;
use dz_core::security::generate_pairing_code;

fn main() {
    let config = DropZeroConfig::default();
    let code = generate_pairing_code();
    println!(
        "DROPZERO Desktop Shell ({}) initialized: device='{}', sample_code={}",
        PROTOCOL_VERSION, config.device_name, code
    );
}
