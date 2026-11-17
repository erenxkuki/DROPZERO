import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  HardDrive,
  Lock,
  Network,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { HeroVisual } from '@/src/components/dropzero/hero-visual';
import { TransferWidget } from '@/src/components/dropzero/transfer-widget';

export function HomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 sm:py-16 space-y-24">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#666666] dark:text-[#929292]">
            Protocol dz-p2p/1.0 · Zero Cloud Storage
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.06] text-[#111111] dark:text-[#F5F5F5]">
            Transfer without limits.
          </h1>
          <p className="text-base sm:text-lg text-[#666666] dark:text-[#929292] leading-relaxed max-w-xl">
            Your devices. Your files. Your connection. Send folders and full-resolution media
            directly between peers with ephemeral ECDH encryption and BLAKE3 integrity verification
            — no accounts, no ads, and no cloud upload step.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/transfer">
              <Button size="lg" variant="primary">
                Open Transfer Workspace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/security">
              <Button size="lg" variant="outline">
                Read Security Model
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E5E5E5] dark:border-[#252525]">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                File Size Cap
              </p>
              <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                Streaming / No artificial cap
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                Integrity
              </p>
              <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                Per-chunk BLAKE3
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                Cost & Accounts
              </p>
              <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                Free forever · Zero login
              </p>
            </div>
          </div>

          <HeroVisual />
        </div>

        <div className="lg:col-span-6">
          <TransferWidget compact />
        </div>
      </section>

      <section className="space-y-8 border-t border-[#E5E5E5] dark:border-[#252525] pt-16">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
            Engineered for Direct Path
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Four deterministic steps from selection to verified save.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Stage locally',
              desc: 'Select files or nested folders. Nothing uploads; metadata stays in browser memory.',
            },
            {
              step: '02',
              title: 'Pair & verify SAS',
              desc: 'Exchange a 6-character code or scan QR. Both peers derive a 6-digit ECDH SAS code.',
            },
            {
              step: '03',
              title: 'Direct WebRTC stream',
              desc: 'Chunks stream peer-to-peer with backpressure control, falling back to E2E relay if NAT blocks ICE.',
            },
            {
              step: '04',
              title: 'BLAKE3 verified write',
              desc: 'Every chunk and the full file digest are verified with BLAKE3 before saving locally.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5"
            >
              <span className="font-mono text-xs text-[#8A8A8A] dark:text-[#626262] tabular-nums">
                {item.step}
              </span>
              <h3 className="mt-3 text-base font-medium text-[#111111] dark:text-[#F5F5F5]">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8 border-t border-[#E5E5E5] dark:border-[#252525] pt-16">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
            Architecture Comparison
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Built against cloud-upload lock-in.
          </h2>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] font-mono uppercase tracking-wider text-[#666666] dark:text-[#929292]">
                <th className="px-5 py-3.5">Capability</th>
                <th className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">DROPZERO</th>
                <th className="px-5 py-3.5">Cloud Drive / File Hosts</th>
                <th className="px-5 py-3.5">Ecosystem-Locked AirDrop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#252525] text-[#666666] dark:text-[#929292]">
              <tr>
                <td className="px-5 py-3.5 font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Server file storage
                </td>
                <td className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">
                  Zero (Direct P2P stream)
                </td>
                <td className="px-5 py-3.5">Stored on third-party disk</td>
                <td className="px-5 py-3.5">Direct local radio</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Cross-platform
                </td>
                <td className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">
                  Windows · Linux · macOS · Android · Web
                </td>
                <td className="px-5 py-3.5">Browser / app</td>
                <td className="px-5 py-3.5">Single vendor hardware only</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Account requirement
                </td>
                <td className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">
                  None (Ephemeral ECDH keys)
                </td>
                <td className="px-5 py-3.5">Email & quota paywalls</td>
                <td className="px-5 py-3.5">Vendor OS account</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-medium text-[#111111] dark:text-[#F5F5F5]">
                  Cryptographic verification
                </td>
                <td className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">
                  6-digit SAS + per-chunk BLAKE3
                </td>
                <td className="px-5 py-3.5">Opaque server TLS</td>
                <td className="px-5 py-3.5">Proprietary handshake</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#E5E5E5] dark:border-[#252525] pt-16">
        {[
          {
            icon: Lock,
            title: 'Ephemeral End-to-End Keys',
            body: 'Every session generates fresh ECDH P-256 keys in browser WebCrypto. Even on relay fallback, frames are sealed with AES-256-GCM before leaving your device.',
          },
          {
            icon: Zap,
            title: 'Backpressure & Adaptive Chunks',
            body: 'DataChannel bufferedAmountLowThreshold throttling prevents memory spikes while adapting chunk sizes from 256 KiB to 4 MiB.',
          },
          {
            icon: ShieldCheck,
            title: 'Receiver Acceptance Gate',
            body: 'Peers inspect sender device name, file manifest, sizes, and SAS code before a single byte of payload is transmitted.',
          },
          {
            icon: Network,
            title: 'Honest Transport Reporting',
            body: 'Telemetry surfaces actual RTCPeerConnection.getStats() measurements — never simulated throughput or synthetic progress bars.',
          },
          {
            icon: HardDrive,
            title: 'Local IndexedDB Persistence',
            body: 'History, recovery checkpoints, and preferences live strictly in your browser’s IndexedDB and can be wiped cleanly in one click.',
          },
          {
            icon: Terminal,
            title: 'Rust Core + Web Parity',
            body: 'Paired with a modular Rust workspace (QUIC, CLI, Tauri v2 desktop, signaling, and encrypted relay) speaking the exact same protocol.',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5"
          >
            <card.icon className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
              {card.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
              {card.body}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Ready to move files without an intermediary?
          </h2>
          <p className="mt-1.5 text-sm text-[#666666] dark:text-[#929292]">
            Open the full workspace or review the protocol specification and Rust workspace source.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link to="/transfer">
            <Button variant="primary">Launch Transfer</Button>
          </Link>
          <Link to="/download">
            <Button variant="outline">
              <Check className="h-4 w-4" aria-hidden="true" />
              Desktop & CLI
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
