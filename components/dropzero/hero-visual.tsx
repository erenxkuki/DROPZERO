'use client';

import React from 'react';
import { motion } from 'motion/react';
import { FileCode2, Laptop, Lock, Smartphone } from 'lucide-react';

export function HeroVisual() {
  return (
    <div
      aria-label="Direct device-to-device transfer diagram"
      className="relative w-full rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 sm:p-8"
    >
      {/* Top technical context row */}
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#E5E5E5] dark:border-[#252525]">
        <span className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
          Peer-to-peer stream
        </span>
        <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
          WebRTC / QUIC · ECDH P-256 · BLAKE3
        </span>
      </div>

      {/* Hardware nodes & direct tunnel */}
      <div className="my-8 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_1fr] items-center">
        {/* Workstation node */}
        <div className="flex flex-col gap-3 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0C0C0C] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Laptop className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                Workstation
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
              Sender
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#151515] px-3 py-2">
            <FileCode2 className="h-4 w-4 text-[#666666] dark:text-[#929292] shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                archive_build.tar.zst
              </p>
              <p className="font-mono text-[11px] text-[#666666] dark:text-[#929292] tabular-nums">
                Chunked · 256 KiB slices
              </p>
            </div>
          </div>
        </div>

        {/* Direct transfer tunnel */}
        <div className="flex flex-col items-center gap-2 px-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#666666] dark:text-[#929292]">
            <Lock className="h-3 w-3 text-[#16A34A] dark:text-[#22C55E]" aria-hidden="true" />
            <span>Direct channel</span>
          </div>
          <div className="relative h-1.5 w-full sm:w-28 overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-[#252525]">
            <motion.div
              className="h-full w-10 rounded-full bg-[#111111] dark:bg-[#F5F5F5]"
              animate={{ x: [-40, 112] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <span className="font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
            SAS verified
          </span>
        </div>

        {/* Smartphone node */}
        <div className="flex flex-col gap-3 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0C0C0C] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#111111] dark:text-[#F5F5F5]">
                Mobile Device
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#666666] dark:text-[#929292]">
              Receiver
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#151515] px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#111111] dark:text-[#F5F5F5] font-medium">
                Explicit acceptance
              </span>
              <span className="font-mono text-[#16A34A] dark:text-[#22C55E]">Verified</span>
            </div>
            <div className="h-1 w-full rounded-full bg-[#E5E5E5] dark:bg-[#252525] overflow-hidden">
              <div className="h-full w-4/5 rounded-full bg-[#111111] dark:bg-[#F5F5F5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom architectural guarantees */}
      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[#E5E5E5] dark:border-[#252525] text-xs">
        <div>
          <p className="font-medium text-[#111111] dark:text-[#F5F5F5]">Zero cloud storage</p>
          <p className="mt-0.5 text-[11px] text-[#666666] dark:text-[#929292]">
            Files stay on your devices
          </p>
        </div>
        <div>
          <p className="font-medium text-[#111111] dark:text-[#F5F5F5]">Chunk integrity</p>
          <p className="mt-0.5 text-[11px] text-[#666666] dark:text-[#929292]">
            BLAKE3 verified per slice
          </p>
        </div>
        <div>
          <p className="font-medium text-[#111111] dark:text-[#F5F5F5]">Relay when needed</p>
          <p className="mt-0.5 text-[11px] text-[#666666] dark:text-[#929292]">
            AES-GCM fallback if NAT blocks
          </p>
        </div>
      </div>
    </div>
  );
}
