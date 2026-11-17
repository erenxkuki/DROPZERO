import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export function FeaturesPage() {
  const sections = [
    {
      code: '01 · CHUNKING & FLOW',
      title: 'Adaptive chunk sizing with strict backpressure',
      body: 'Files are sliced into 256 KiB to 4 MiB chunks based on payload size and transport path. On WebRTC DataChannels, bufferedAmountLowThreshold pauses reads before browser memory spikes.',
    },
    {
      code: '02 · INTEGRITY',
      title: 'Streaming BLAKE3 chunk + whole-file verification',
      body: 'Each binary chunk frame embeds a 32-byte BLAKE3 digest in its header, verified immediately on arrival. Once all chunks complete, a streaming full-file BLAKE3 root confirms zero corruption.',
    },
    {
      code: '03 · STATE MACHINE',
      title: '15-state deterministic transfer FSM',
      body: 'Every session follows validated transitions from IDLE and CREATING_SESSION through AUTHENTICATING, AWAITING_ACCEPTANCE, TRANSFERRING, VERIFYING, and COMPLETED—preventing stray out-of-order frames.',
    },
    {
      code: '04 · TRANSPORT FALLBACK',
      title: 'LAN -> STUN -> Encrypted WebSocket relay',
      body: 'Sessions prioritize direct host/LAN candidates via WebRTC, escalate to STUN NAT traversal when needed, and seamlessly switch to an AES-256-GCM E2E encrypted WebSocket relay if corporate firewalls block UDP.',
    },
    {
      code: '05 · FOLDERS & RESUME',
      title: 'Recursive directory drops & IndexedDB checkpoints',
      body: 'Drag whole folders with sanitized relative paths and recover interrupted sessions via IndexedDB chunk checkpoints.',
    },
    {
      code: '06 · CROSS-PLATFORM',
      title: 'Unified protocol across Web, Desktop & CLI',
      body: 'Browser peers interoperate over the shared dz-p2p/1.0 framing alongside the modular Rust core powering desktop and CLI targets.',
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 space-y-12">
      <div className="max-w-2xl border-b border-[#E5E5E5] dark:border-[#252525] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
          Technical Capabilities
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Engineered for unthrottled local and remote throughput.
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          DROPZERO removes the artificial barriers of cloud uploaders—no compression of media, no
          arbitrary file limits, and zero server disk writes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((s) => (
          <div
            key={s.code}
            className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6"
          >
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
              {s.code}
            </p>
            <h2 className="mt-3 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
              {s.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
              {s.body}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link to="/transfer">
          <Button variant="primary">
            Open Transfer Console
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <Link to="/security">
          <Button variant="outline">Inspect Cryptography</Button>
        </Link>
      </div>
    </div>
  );
}
