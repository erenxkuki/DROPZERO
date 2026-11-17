import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 space-y-10">
      <div className="max-w-2xl border-b border-[#E5E5E5] dark:border-[#252525] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
          About DROPZERO
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Moving bytes from one screen to another should not require a cloud subscription.
        </h1>
      </div>

      <div className="max-w-3xl space-y-6 text-sm leading-relaxed text-[#666666] dark:text-[#929292]">
        <p>
          Modern workflows scatter files across Linux workstations, macOS laptops, Windows desktops,
          and Android phones. Yet moving a 4 GiB project archive between two devices sitting on the
          same desk routinely forces users through slow cloud uploads, size caps, login prompts, or
          lossy messaging compression.
        </p>
        <p>
          DROPZERO is an open-source, dual-licensed (MIT / Apache-2.0) peer-to-peer transport system
          designed around a monochrome engineering standard: direct device-to-device paths first,
          transparent telemetry instead of fake progress animations, ephemeral ECDH cryptography, and
          BLAKE3 integrity verification on every single chunk.
        </p>
        <p>
          The platform pairs this browser client with a modular Rust workspace covering QUIC
          transport, desktop packaging via Tauri v2, headless CLI transfers, and minimal signaling
          and encrypted relay services.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/transfer">
          <Button variant="primary">Launch Transfer Workspace</Button>
        </Link>
        <Link to="/download">
          <Button variant="outline">View Build Targets</Button>
        </Link>
      </div>
    </div>
  );
}
