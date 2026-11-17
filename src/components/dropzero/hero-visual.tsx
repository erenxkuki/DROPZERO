import React from 'react';
import { Laptop, Lock, Smartphone } from 'lucide-react';

export function HeroVisual() {
  return (
    <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#101010] p-6">
      <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#252525] pb-3 text-[11px] font-mono text-[#666666] dark:text-[#929292]">
        <span>DIRECT TRANSPORT PIPELINE</span>
        <span>ECDH P-256 · AES-256-GCM · BLAKE3</span>
      </div>

      <div className="my-6 grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
        <div className="rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#141414] p-4">
          <div className="flex items-center gap-2.5 text-[#111111] dark:text-[#F5F5F5]">
            <Laptop className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium">Sender Node</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            Slice 256 KiB–4 MiB
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
            Per-chunk BLAKE3 digest
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          <div className="flex w-full items-center gap-2">
            <div className="h-[1px] flex-1 bg-[#D4D4D4] dark:bg-[#333333]" />
            <div className="flex items-center gap-1.5 rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] px-2.5 py-1 text-[11px] font-mono text-[#111111] dark:text-[#F5F5F5]">
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>DTLS / QUIC</span>
            </div>
            <div className="h-[1px] flex-1 bg-[#D4D4D4] dark:bg-[#333333]" />
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
            Signaling handshake only · Files bypass server
          </p>
        </div>

        <div className="rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#141414] p-4">
          <div className="flex items-center gap-2.5 text-[#111111] dark:text-[#F5F5F5]">
            <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium">Receiver Node</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            Explicit consent gate
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
            Full-stream hash check
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-[#E5E5E5] dark:border-[#252525] pt-4 font-mono text-[11px]">
        <div>
          <span className="block text-[#8A8A8A] dark:text-[#626262]">PATH PRIORITY</span>
          <span className="mt-0.5 block text-[#111111] dark:text-[#F5F5F5]">LAN → STUN → Relay</span>
        </div>
        <div>
          <span className="block text-[#8A8A8A] dark:text-[#626262]">AUTH MODEL</span>
          <span className="mt-0.5 block text-[#111111] dark:text-[#F5F5F5]">6-Digit SAS Verify</span>
        </div>
        <div>
          <span className="block text-[#8A8A8A] dark:text-[#626262]">STORAGE</span>
          <span className="mt-0.5 block text-[#111111] dark:text-[#F5F5F5]">Zero Server Disk</span>
        </div>
      </div>
    </div>
  );
}
