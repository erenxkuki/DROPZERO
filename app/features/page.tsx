import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const CAPABILITY_SECTIONS = [
  {
    index: '01.',
    title: 'Direct device-to-device transport',
    summary:
      'Connects peers directly over WebRTC DataChannels in browsers and Quinn QUIC in the native Rust core. When direct connectivity succeeds, file payloads never traverse intermediary file servers.',
  },
  {
    index: '02.',
    title: 'Streaming chunk pipeline & backpressure',
    summary:
      'Files are sliced incrementally (64 KiB, 256 KiB, or 1 MiB) and governed by bounded channels and SCTP bufferedAmountLow thresholds so memory consumption remains predictable even on large payloads.',
  },
  {
    index: '03.',
    title: 'End-to-end BLAKE3 verification',
    summary:
      'Every frame includes a 32-byte BLAKE3 chunk digest, and completed files are verified against a streaming whole-file BLAKE3 hash prior to atomic finalization or browser save.',
  },
  {
    index: '04.',
    title: 'Ephemeral QR & SAS pairing',
    summary:
      'Six-character pairing codes expire automatically after 10 minutes. Peers perform an ephemeral ECDH P-256 exchange to derive a 6-digit Short Authentication String (SAS) before accepting files.',
  },
  {
    index: '05.',
    title: 'Multi-file & folder queuing',
    summary:
      'Drag and drop nested directories or select multiple files. Path segments are sanitized against traversal attacks before appearing on the receiver acceptance screen.',
  },
  {
    index: '06.',
    title: 'Honest relay fallback',
    summary:
      'When symmetric NATs or strict corporate firewalls block direct ICE candidates, DROPZERO falls back to an AES-256-GCM encrypted relay using your ECDH session key and clearly labels the transport as relayed.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 flex flex-col gap-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Engineered for direct transfers
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          DROPZERO is designed around a shared protocol and security model across web browsers and native desktop clients—without accounts, ads, or artificial speed limits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CAPABILITY_SECTIONS.map((cap) => (
          <article
            key={cap.title}
            className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6"
          >
            <span className="font-mono text-xs text-[#666666] dark:text-[#929292]">
              {cap.index}
            </span>
            <h2 className="mt-2 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
              {cap.title}
            </h2>
            <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              {cap.summary}
            </p>
          </article>
        ))}
      </div>

      {/* Browser vs Native honest matrix */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Browser web client vs. Native Rust core
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#252525] text-[#666666] dark:text-[#929292]">
                <th className="py-3 px-4 font-medium">Capability</th>
                <th className="py-3 px-4 font-medium">DROPZERO Web</th>
                <th className="py-3 px-4 font-medium">DROPZERO Desktop (Rust + Tauri)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#252525]">
              <tr>
                <td className="py-3 px-4 font-medium">Primary transport</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">WebRTC DataChannel (DTLS/SCTP)</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">Native QUIC (Quinn / TLS 1.3) + WebRTC</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Local network discovery</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">Signaling discovery &amp; QR/code pairing</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">mDNS / DNS-SD + QR/code pairing</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Disk streaming</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">File API slices + Blob / Save dialog</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">Direct Tokio async file I/O + atomic temp rename</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Integrity hashing</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">BLAKE3 (WASM streaming)</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">BLAKE3 (native SIMD)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Metadata storage</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">Browser IndexedDB</td>
                <td className="py-3 px-4 text-[#666666] dark:text-[#929292]">Local SQLite database</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/transfer"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-xs font-medium bg-[#111111] text-[#FAFAFA] dark:bg-[#F5F5F5] dark:text-[#080808]"
        >
          <span>Open transfer workspace</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/download"
          className="inline-flex items-center h-10 px-5 rounded-md text-xs font-medium border border-[#E5E5E5] dark:border-[#252525] text-[#111111] dark:text-[#F5F5F5]"
        >
          View desktop architecture
        </Link>
      </div>
    </div>
  );
}
