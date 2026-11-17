import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Privacy policy &amp; data boundaries
        </h1>
        <p className="mt-3 text-sm text-[#666666] dark:text-[#929292] leading-relaxed">
          DROPZERO is built so you do not have to trust a central file server. Below is an exact accounting of what stays local and what touches network infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            What remains strictly on your device
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            <li>· Selected file contents before a session is explicitly started.</li>
            <li>· Transfer history records (stored in IndexedDB or local SQLite only).</li>
            <li>· Optional remembered device fingerprints (disabled by default).</li>
            <li>· Recovery chunk checkpoints and user settings.</li>
            <li>· Ephemeral ECDH private keys (never exported or logged).</li>
          </ul>
        </section>

        <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            What the signaling server observes
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            <li>· Temporary 6-character pairing code and session expiration timestamp.</li>
            <li>· Your chosen device display name, browser/OS label, and ECDH public JWK.</li>
            <li>· WebRTC SDP offers/answers and ICE candidates needed to punch through NATs.</li>
            <li>· It never receives filenames, file sizes, or unencrypted file payloads.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            What happens when direct P2P fails
          </h2>
          <p className="mt-3 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            If your network blocks direct WebRTC or QUIC connections, DROPZERO does not pretend the connection is direct. When fallback is permitted, data frames are encrypted end-to-end with AES-256-GCM using your ECDH-derived session key before passing through the relay. The relay can observe packet timing and ciphertext size, but not plaintext filenames or file contents.
          </p>
        </section>

        <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Zero analytics or ad networks
          </h2>
          <p className="mt-3 text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
            DROPZERO sends zero filenames, transfer statistics, crash reports, or usage telemetry to third-party analytics services. You can inspect or wipe all local browser storage at any time from Settings.
          </p>
        </section>
      </div>
    </div>
  );
}
