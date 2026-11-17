use std::path::{Path, PathBuf};
use thiserror::Error;
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, SeekFrom};

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("unsafe destination path: {0}")]
    Security(#[from] dz_security::SecurityError),
}

pub fn safe_join(root: &Path, relative_path: &str) -> Result<PathBuf, StorageError> {
    let clean = dz_security::sanitize_relative_path(relative_path)?;
    Ok(root.join(clean))
}

pub async fn write_chunk_at(
    path: &Path,
    offset: u64,
    bytes: &[u8],
) -> Result<(), StorageError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }
    let mut file = fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(path)
        .await?;
    file.seek(SeekFrom::Start(offset)).await?;
    file.write_all(bytes).await?;
    Ok(())
}

pub async fn read_chunk_at(
    path: &Path,
    offset: u64,
    len: usize,
) -> Result<Vec<u8>, StorageError> {
    let mut file = fs::File::open(path).await?;
    file.seek(SeekFrom::Start(offset)).await?;
    let mut buf = vec![0u8; len];
    let n = file.read(&mut buf).await?;
    buf.truncate(n);
    Ok(buf)
}
