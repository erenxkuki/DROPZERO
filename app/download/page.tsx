import React from 'react';
import Link from 'next/link';
import { Monitor, Terminal } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Downloads &amp; Native Desktop
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          Use DROPZERO Web immediately in any modern browser, or compile the native Rust + Tauri desktop application from the workspace included in this repository.
        </p>
      </div>

      {/* Platform targets */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#111111] dark:text-[#F5F5F5]">
              <Monitor className="h-4 w-4" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Windows Desktop (Priority 1)</h2>
            </div>
            <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Tauri v2 shell backed by `dz-core`, Quinn QUIC transport, Tokio async disk I/O, and SQLite recovery metadata.
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            Source target: dropzero/apps/desktop
          </span>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#111111] dark:text-[#F5F5F5]">
              <Monitor className="h-4 w-4" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Linux &amp; macOS Desktop</h2>
            </div>
            <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Shares the identical Rust workspace (`dz-quic`, `dz-transfer`, `dz-integrity`, `dz-security`) across x86_64 and ARM64 targets.
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            Source target: dropzero/apps/desktop
          </span>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#111111] dark:text-[#F5F5F5]">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <h2 className="text-sm font-semibold">DROPZERO CLI &amp; Benchmarks</h2>
            </div>
            <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Headless native transfer client and reproducible benchmark harness for 100 MB, 1 GB, and 10 GB QUIC throughput runs.
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            Source target: dropzero/apps/cli
          </span>
        </div>
      </div>

      {/* Honest build instructions */}
      <section
        id="source"
        className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 flex flex-col gap-4"
      >
        <div>
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Build the native Rust workspace from source
          </h2>
          <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
            Pre-compiled signed installers are not hosted on this preview server. Build and verify the full workspace locally with Rust stable (1.82+) and Cargo:
          </p>
        </div>

        <pre className="overflow-x-auto rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0B0B0B] p-4 font-mono text-xs text-[#111111] dark:text-[#F5F5F5]">
{`cd dropzero
cargo test --workspace
cargo build --release -p dropzero-cli
# Desktop Tauri bundle (requires Tauri system prerequisites)
cd apps/desktop && cargo tauri build`}
        </pre>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/transfer"
            className="inline-flex items-center h-9 px-4 rounded-md text-xs font-medium bg-[#111111] text-[#FAFAFA] dark:bg-[#F5F5F5] dark:text-[#080808]"
          >
            Use DROPZERO Web now
          </Link>
        </div>
      </section>
    </div>
  );
}
