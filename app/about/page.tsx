import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          About DROPZERO
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          DROPZERO exists to make moving files between your own devices fast, verifiable, and free of cloud accounts, artificial bandwidth caps, or tracking scripts.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Core philosophy
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            <li>· Free forever with zero advertisements or paid speed tiers.</li>
            <li>· No mandatory user accounts or persistent cloud file hosting.</li>
            <li>· Direct peer-to-peer connectivity preferred whenever possible.</li>
            <li>· Transparent reporting of direct vs. relayed transport paths.</li>
            <li>· Integrity and explicit user consent ahead of raw throughput.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Ecosystem architecture
          </h2>
          <p className="mt-3 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            The web client runs directly in modern browsers using WebRTC and streaming WASM BLAKE3 so anyone can transfer files without installing software. Alongside it, the modular Rust workspace (`dropzero/crates/*`) provides native QUIC transport via Quinn, local SQLite metadata, recovery tracking, and a Tauri desktop shell targeting Windows, Linux, and macOS.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
          No simulated metrics
        </h2>
        <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
          Every speed reading, RTT measurement, candidate type, and verification hash displayed in DROPZERO comes directly from measured byte counters, `RTCPeerConnection.getStats()`, and BLAKE3 digests. When a measurement is unavailable, the interface explicitly displays Unavailable.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/security" className="underline text-[#111111] dark:text-[#F5F5F5]">
          Security model
        </Link>
        <span className="text-[#929292]">·</span>
        <Link href="/privacy" className="underline text-[#111111] dark:text-[#F5F5F5]">
          Privacy architecture
        </Link>
        <span className="text-[#929292]">·</span>
        <Link href="/download" className="underline text-[#111111] dark:text-[#F5F5F5]">
          Desktop &amp; Rust workspace
        </Link>
      </div>
    </div>
  );
}
