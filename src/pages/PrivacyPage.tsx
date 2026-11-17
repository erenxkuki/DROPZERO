import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';

export function PrivacyPage() {
  const guarantees = [
    {
      title: 'Zero mandatory accounts or emails',
      body: 'Open DROPZERO and pair devices immediately. We do not issue user IDs, passwords, OAuth tokens, or tracking cookies.',
    },
    {
      title: 'Zero cloud storage of your files',
      body: 'Files travel directly between sender and receiver memory. Our server has no object store, S3 bucket, or database holding your payloads.',
    },
    {
      title: 'Zero analytics or third-party ad SDKs',
      body: 'No Google Analytics, no behavioral pixels, no session replay scripts, and no ad networks exist anywhere in the codebase.',
    },
    {
      title: 'Ephemeral in-memory signaling only',
      body: 'The signaling process keeps pairing rooms solely in RAM for up to 10 minutes and deletes them on disconnect or expiry.',
    },
    {
      title: '100% browser-local persistence',
      body: 'Transfer history, settings, and optional remembered peer fingerprints live in your local IndexedDB store. Wipe everything in one click from Settings.',
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 space-y-10">
      <div className="max-w-2xl border-b border-[#E5E5E5] dark:border-[#252525] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
          Privacy Commitment
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Your files are never ours to inspect, index, or monetize.
        </h1>
      </div>

      <div className="space-y-4 max-w-3xl">
        {guarantees.map((item, idx) => (
          <div
            key={item.title}
            className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5"
          >
            <p className="font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
              0{idx + 1}
            </p>
            <h2 className="mt-1.5 text-base font-medium text-[#111111] dark:text-[#F5F5F5]">
              {item.title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <div>
        <Link to="/settings">
          <Button variant="outline">Manage Local Storage & Wipe Controls</Button>
        </Link>
      </div>
    </div>
  );
}
