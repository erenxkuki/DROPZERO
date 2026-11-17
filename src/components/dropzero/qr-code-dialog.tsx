import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy } from 'lucide-react';
import { Dialog } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';

export interface QRCodeDialogProps {
  open: boolean;
  onClose: () => void;
  pairingCode: string;
}

export function QRCodeDialog({ open, onClose, pairingCode }: QRCodeDialogProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/transfer?pair=${pairingCode}`
      : `/transfer?pair=${pairingCode}`;

  useEffect(() => {
    if (!open || !pairingCode) return;
    let active = true;
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, pairingCode, joinUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Scan to pair"
      description="Open this link or scan on your receiving device to join the encrypted session."
      maxWidthClass="max-w-sm"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-4">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`Pairing QR code for ${pairingCode}`}
              width={208}
              height={208}
              className="h-52 w-52 block"
            />
          ) : (
            <div className="h-52 w-52 flex items-center justify-center text-xs text-[#666666]">
              Generating QR…
            </div>
          )}
        </div>

        <div className="w-full rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#101010] px-3 py-2.5 text-center">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
            Pairing Code
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.22em] text-[#111111] dark:text-[#F5F5F5] tabular-nums">
            {pairingCode}
          </p>
        </div>

        <div className="flex w-full items-center gap-2">
          <Button variant="outline" className="flex-1" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[#16A34A] dark:text-[#22C55E]" aria-hidden="true" />
                Copied Link
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy Pairing Link
              </>
            )}
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
