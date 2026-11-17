import React from 'react';
import { KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';

export function SecurityPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 space-y-12">
      <div className="max-w-2xl border-b border-[#E5E5E5] dark:border-[#252525] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
          Cryptographic Architecture
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Verified end-to-end before a single file byte moves.
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          DROPZERO treats signaling and fallback relays as untrusted pipes. Confidentiality,
          integrity, and peer identity verification are enforced directly at the endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <KeyRound className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Ephemeral ECDH P-256 & HKDF-SHA256
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
            Every pairing session creates a fresh browser WebCrypto ECDH P-256 keypair (X25519 on
            native Rust nodes). Public keys are exchanged during pairing and fed into HKDF-SHA256
            bound to the session ID to derive an AES-256-GCM key and an independent 6-digit Short
            Authentication String (SAS).
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <ShieldCheck className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Out-of-Band SAS & Explicit Consent Gate
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
            Comparing the 6-digit SAS code on both screens defeats active man-in-the-middle key
            substitution even if a signaling server were compromised. Receivers always inspect the
            file manifest and click Accept before data transmission starts.
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <Lock className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Transport Encryption + Relay Sealing
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
            Direct transfers run inside WebRTC DTLS (or QUIC TLS 1.3 in Rust). When strict NATs
            require relay fallback, frames are encrypted locally using AES-256-GCM with random
            96-bit IVs so the relay server only forwards opaque ciphertext.
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <ShieldAlert className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Path Traversal & Frame Hardening
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
            Incoming filenames and folder paths strip control characters, null bytes, drive
            prefixes, and parent directory segments (..). Every chunk checks its 32-byte BLAKE3
            header digest immediately and aborts on mismatch.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#101010] p-6 font-mono text-xs text-[#666666] dark:text-[#929292] space-y-2">
        <p className="text-[#111111] dark:text-[#F5F5F5] font-semibold">THREAT MODEL BOUNDARIES</p>
        <p>
          1. Signaling server sees: temporary pairing code, session TTL, device label, and SDP/ICE
          metadata — never file payloads or derived session keys.
        </p>
        <p>
          2. Pairing codes expire automatically after 10 minutes or immediately once the transfer
          session ends.
        </p>
      </div>
    </div>
  );
}
