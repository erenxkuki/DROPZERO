use clap::{Parser, Subcommand};
use dz_core::config::DropZeroConfig;
use dz_core::integrity::StreamingVerifier;
use dz_core::protocol::select_initial_chunk_size;
use dz_core::security::generate_pairing_code;
use dz_core::storage::read_chunk_at;
use dz_core::transfer::ChunkPipeline;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "dropzero", version, about = "DROPZERO direct peer-to-peer CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Send {
        #[arg(value_name = "PATH")]
        path: PathBuf,
    },
    Receive {
        #[arg(long)]
        code: Option<String>,
        #[arg(long, default_value = ".")]
        out: PathBuf,
    },
    Hash {
        #[arg(value_name = "PATH")]
        path: PathBuf,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let cfg = DropZeroConfig::default();
    cfg.validate()?;

    match cli.command {
        Commands::Send { path } => {
            let meta = tokio::fs::metadata(&path).await?;
            let pairing_code = generate_pairing_code();
            let chunk_size = select_initial_chunk_size(meta.len(), false);
            println!("DROPZERO Send Ready");
            println!("  Pairing Code : {}", pairing_code);
            println!("  Signaling    : {}", cfg.signaling_url);
            println!("  File         : {} ({} bytes)", path.display(), meta.len());
            println!("  Chunk Size   : {} bytes", chunk_size);
        }
        Commands::Receive { code, out } => {
            let active_code = code.unwrap_or_else(generate_pairing_code);
            println!("DROPZERO Receive Ready");
            println!("  Pairing Code : {}", active_code);
            println!("  Signaling    : {}", cfg.signaling_url);
            println!("  Destination  : {}", out.display());
        }
        Commands::Hash { path } => {
            let meta = tokio::fs::metadata(&path).await?;
            let chunk_size = select_initial_chunk_size(meta.len(), false) as usize;
            let mut verifier = StreamingVerifier::new();
            let mut offset = 0u64;
            let mut idx = 0u32;
            while offset < meta.len() {
                let slice = read_chunk_at(&path, offset, chunk_size).await?;
                if slice.is_empty() {
                    break;
                }
                verifier.update(&slice);
                let _frame = ChunkPipeline::build_frame(0, idx, &slice);
                offset += slice.len() as u64;
                idx += 1;
            }
            println!("BLAKE3 {}", verifier.finalize_hex());
        }
    }

    Ok(())
}
