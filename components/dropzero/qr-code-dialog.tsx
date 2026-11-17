'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function QRCodeDialog({
  open,
  onClose,
  pairingCode,
  pairingUrl,
  expiresAt,
}: {
  open: boolean;
  onClose: () => void;
  pairingCode: string;
  pairingUrl: string;
  expiresAt: number | null;
}) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !pairingUrl) return;
    let active = true;
    QRCode.toString(pairingUrl, {
      type: 'svg',
      margin: 2,
      width: 220,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });
    return () => {
      active = false;
    };
  }, [open, pairingUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pair device via QR code"
      description="Scan with another device on your camera or enter the 6-character code. QR contains no private keys."
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="rounded-lg border border-[#E5E5E5] bg-white p-3"
          aria-label={`QR code for pairing session ${pairingCode}`}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />

        <div className="text-center">
          <p className="text-xs text-[#666666] dark:text-[#929292]">Pairing code</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.25em] text-[#111111] dark:text-[#F5F5F5]">
            {pairingCode}
          </p>
          {expiresAt && (
            <p className="mt-1 text-[11px] text-[#666666] dark:text-[#929292]">
              Expires at {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="flex w-full items-center gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Link copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy pairing link</span>
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
