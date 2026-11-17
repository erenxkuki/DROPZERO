import React from 'react';

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Security architecture &amp; threat model
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          Security in DROPZERO is enforced at the protocol layer before any file bytes are transmitted or written to disk.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Authenticated key exchange (ECDH + SAS)
          </h2>
          <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            Both peers generate fresh ephemeral ECDH P-256 keys per session. After pairing, both sides derive a shared HKDF-SHA256 secret bound to the session ID and compute a 6-digit Short Authentication String (SAS) to detect active man-in-the-middle substitution on signaling.
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Transport &amp; payload encryption
          </h2>
          <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            Browser WebRTC DataChannels enforce DTLS 1.2/1.3 encryption natively. Native desktop transfers run over Quinn QUIC with TLS 1.3. When relay fallback is active, payloads are additionally encrypted with AES-256-GCM using the session-derived key.
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Path traversal &amp; filename sanitization
          </h2>
          <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            Incoming filenames and folder segments are stripped of null bytes, control characters, drive prefixes, dot-dot traversal segments, and Windows reserved device names before display or saving. Received files are never automatically executed or opened.
          </p>
        </div>

        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Explicit acceptance &amp; expiration
          </h2>
          <p className="mt-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            Pairing sessions expire automatically after 10 minutes, enforce single-guest occupancy to prevent pairing replay, rate-limit signaling sockets, and require explicit receiver confirmation before any chunk streams.
          </p>
        </div>
      </section>

      <section
        id="protocol"
        className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6"
      >
        <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
          Binary frame specification (Protocol v1.0.0)
        </h2>
        <pre className="mt-3 overflow-x-auto rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0B0B0B] p-4 font-mono text-xs text-[#111111] dark:text-[#F5F5F5]">
{`+--------+------------+-------------+----------------+-------+----------+
| Magic  | File Index | Chunk Index | Payload Length | Flags | Reserved |
| 2 B    | 2 B (u16)  | 4 B (u32)   | 4 B (u32)      | 2 B   | 2 B      |
+--------+------------+-------------+----------------+-------+----------+
|                   BLAKE3 Chunk Digest (32 Bytes)                      |
+-----------------------------------------------------------------------+
|                   Chunk Payload (Variable Length)                     |
+-----------------------------------------------------------------------+`}
        </pre>
      </section>
    </div>
  );
}
