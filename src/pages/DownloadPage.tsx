import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Globe, Laptop, Monitor, Smartphone, Terminal } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export function DownloadPage() {
  const repoUrl =
    (import.meta.env.VITE_DROPZERO_REPO_URL as string | undefined)?.trim() || '';

  const targets = [
    {
      icon: Globe,
      name: 'Web Application',
      status: 'Active Now (Browser)',
      detail:
        'Runs directly in modern Chromium, Firefox, and Safari with WebRTC DataChannels, WebCrypto ECDH, and WASM BLAKE3.',
      cta: 'Open Web Transfer',
      to: '/transfer',
    },
    {
      icon: Terminal,
      name: 'Rust CLI (dropzero-cli)',
      status: 'Source Workspace Included',
      detail:
        'Headless high-throughput peer transfer over QUIC and WebRTC signaling. Build locally from /dropzero with cargo build --release.',
      cmd: 'cargo build --release -p dropzero-cli',
    },
    {
      icon: Monitor,
      name: 'Windows / macOS / Linux Desktop',
      status: 'Tauri v2 Source Included',
      detail:
        'Native filesystem streaming with zero browser RAM buffering via Rust dz-core and Tauri v2 IPC bindings in /dropzero/apps/desktop.',
      cmd: 'cargo tauri build',
    },
    {
      icon: Smartphone,
      name: 'Android & Mobile Web',
      status: 'Mobile Web Active · Native Roadmap',
      detail:
        'Scan QR codes directly into the mobile browser workspace today; Rust core FFI bindings target native mobile builds.',
      cta: 'Pair Mobile Browser',
      to: '/transfer',
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 space-y-10">
      <div className="max-w-2xl border-b border-[#E5E5E5] dark:border-[#252525] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
          Cross-Platform Clients & Source Builds
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Download & Build Targets
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          Use the Web client immediately with zero installation, or compile native Rust CLI and
          Tauri v2 desktop binaries directly from the included workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {targets.map((t) => (
          <div
            key={t.name}
            className="flex flex-col justify-between gap-4 rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <t.icon className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
                    {t.name}
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
                  {t.status}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
                {t.detail}
              </p>
            </div>

            {t.cmd ? (
              <pre className="overflow-x-auto rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] px-3 py-2 font-mono text-[11px] text-[#111111] dark:text-[#F5F5F5]">
                {t.cmd}
              </pre>
            ) : t.to ? (
              <div>
                <Link to={t.to}>
                  <Button size="sm" variant="primary">
                    {t.cta}
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#101010] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Laptop className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              Pre-built release artifacts & source repository
            </p>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              {repoUrl
                ? 'Download signed checksums and binary tarballs from the configured repository.'
                : 'Set VITE_DROPZERO_REPO_URL in your deployment environment to link pre-built release binaries.'}
            </p>
          </div>
        </div>
        {repoUrl && (
          <a href={repoUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              Open Releases
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
