import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroVisual } from '@/components/dropzero/hero-visual';
import { TransferWidget } from '@/components/dropzero/transfer-widget';

const FEATURES = [
  {
    title: 'Direct device transfers',
    description:
      'Streams directly between browsers over WebRTC DataChannels and between native desktop clients over Quinn QUIC without intermediate storage.',
    span: 'md:col-span-2',
  },
  {
    title: 'Large-file support',
    description:
      'Bounded streaming reads slice files chunk by chunk so transfers never load multi-gigabyte payloads into memory at once.',
    span: 'md:col-span-1',
  },
  {
    title: 'QR pairing',
    description:
      'Ephemeral 6-character pairing codes and scannable QR links establish short-lived sessions verified with a 6-digit SAS code.',
    span: 'md:col-span-1',
  },
  {
    title: 'Multi-device sharing',
    description:
      'Stage multiple files or nested folders in a bounded queue with individual progress, pause/resume controls, and clean cancellation.',
    span: 'md:col-span-1',
  },
  {
    title: 'Transfer recovery',
    description:
      'Chunk completion metadata is persisted locally in IndexedDB and SQLite so interrupted sessions can track verified progress.',
    span: 'md:col-span-1',
  },
  {
    title: 'Integrity verification',
    description:
      'Every chunk carries a 32-byte BLAKE3 digest and every completed file is verified end-to-end before finalization.',
    span: 'md:col-span-2',
  },
  {
    title: 'Cross-platform compatibility',
    description:
      'Works instantly in modern browsers with zero installation, designed to interoperate with the Rust core on Windows, Linux, and macOS.',
    span: 'md:col-span-1',
  },
  {
    title: 'Local network transfers',
    description:
      'Automatically prefers host ICE candidates on the same LAN and supports mDNS local discovery in the native Rust engine.',
    span: 'md:col-span-2',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero section */}
      <section className="py-14 sm:py-20 border-b border-[#E5E5E5] dark:border-[#252525]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 flex flex-col items-start">
            <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-semibold tracking-tight leading-[1.08] text-[#111111] dark:text-[#F5F5F5]">
              Transfer without limits.
            </h1>
            <p className="mt-4 max-w-lg text-base text-[#666666] dark:text-[#929292] leading-relaxed">
              Send files directly between your devices. Fast, private, and completely free.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#transfer-workspace"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md text-sm font-medium bg-[#111111] text-[#FAFAFA] hover:bg-[#262626] dark:bg-[#F5F5F5] dark:text-[#080808] dark:hover:bg-[#E0E0E0] transition-colors whitespace-nowrap"
              >
                <span>Start transferring</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/features"
                className="inline-flex items-center justify-center h-11 px-5 rounded-md text-sm font-medium border border-[#E5E5E5] dark:border-[#252525] text-[#111111] dark:text-[#F5F5F5] hover:bg-[#F1F1F1] dark:hover:bg-[#151515] transition-colors whitespace-nowrap"
              >
                Explore DROPZERO
              </Link>
            </div>

            <p className="mt-6 text-xs text-[#666666] dark:text-[#929292]">
              No account required · No advertisements · No mandatory cloud uploads
            </p>
          </div>

          <div className="lg:col-span-6">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Main transfer widget */}
      <section
        id="transfer-workspace"
        className="py-14 sm:py-16 border-b border-[#E5E5E5] dark:border-[#252525]"
      >
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
              Direct transfer workspace
            </h2>
            <p className="mt-1 text-sm text-[#666666] dark:text-[#929292]">
              Stage files locally or enter a pairing code to connect with another device right now.
            </p>
          </div>
          <Link
            href="/transfer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#111111] dark:text-[#F5F5F5] hover:underline whitespace-nowrap"
          >
            <span>Open full workspace</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <TransferWidget />
      </section>

      {/* Trust section */}
      <section className="py-14 sm:py-16 border-b border-[#E5E5E5] dark:border-[#252525]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              DIRECT WHEN POSSIBLE
            </h3>
            <p className="mt-2.5 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
              Files travel directly between connected devices whenever network conditions permit. When restrictive NATs prevent direct connectivity, an end-to-end encrypted relay fallback keeps your transfer moving and reports the relay status honestly.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              PRIVATE BY DESIGN
            </h3>
            <p className="mt-2.5 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
              DROPZERO does not require an account or permanent cloud file storage. Ephemeral ECDH keys authenticate peers with a 6-digit verification code before any file bytes leave your device.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#111111] dark:text-[#F5F5F5]">
              FREE FOREVER
            </h3>
            <p className="mt-2.5 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
              No advertisements, subscriptions, or paid speed upgrades. Transfer rates reflect your actual hardware, disk throughput, and network path without artificial throttling.
            </p>
          </div>
        </div>
      </section>

      {/* Features bento section */}
      <section className="py-14 sm:py-16 border-b border-[#E5E5E5] dark:border-[#252525]">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
              Engineered for speed and verification
            </h2>
            <p className="mt-1 text-sm text-[#666666] dark:text-[#929292]">
              Every subsystem is built around bounded memory, explicit user consent, and cryptographic integrity.
            </p>
          </div>
          <Link
            href="/security"
            className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5] hover:underline whitespace-nowrap"
          >
            Read threat model →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className={`rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 ${feat.span}`}
            >
              <h3 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
                {feat.title}
              </h3>
              <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-16">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
            <span className="font-mono text-xs text-[#666666] dark:text-[#929292]">01.</span>
            <h3 className="mt-2 text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
              Connect your devices
            </h3>
            <p className="mt-1.5 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Generate a short-lived 6-character pairing code or QR link and confirm the matching SAS digits.
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
            <span className="font-mono text-xs text-[#666666] dark:text-[#929292]">02.</span>
            <h3 className="mt-2 text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
              Select your files
            </h3>
            <p className="mt-1.5 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Drop files or folders locally. The receiving peer sees exact filenames and sizes and must accept explicitly.
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
            <span className="font-mono text-xs text-[#666666] dark:text-[#929292]">03.</span>
            <h3 className="mt-2 text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
              Transfer directly
            </h3>
            <p className="mt-1.5 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              Chunks stream with backpressure and BLAKE3 verification until the complete file is confirmed intact.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
