import React, { useEffect, useState } from 'react';
import { CheckCircle2, Laptop, Lock, Pause, Play, Smartphone } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

type PipelineMode = 'webrtc' | 'quic' | 'relay';

interface ModeSpec {
  id: PipelineMode;
  label: string;
  tunnel: string;
  chunk: string;
  route: string;
  encryption: string;
  speedSec: number;
}

const MODE_SPECS: Record<PipelineMode, ModeSpec> = {
  webrtc: {
    id: 'webrtc',
    label: 'WebRTC P2P',
    tunnel: 'DTLS 1.3 · Direct',
    chunk: '256 KiB – 4 MiB',
    route: 'ICE Host / STUN',
    encryption: 'ECDH P-256 · DTLS',
    speedSec: 1.6,
  },
  quic: {
    id: 'quic',
    label: 'Native QUIC',
    tunnel: 'QUIC · TLS 1.3 ALPN',
    chunk: '4 MiB Multiplexed',
    route: 'Direct LAN / UDP',
    encryption: 'X25519 · TLS 1.3',
    speedSec: 1.15,
  },
  relay: {
    id: 'relay',
    label: 'E2E Relay',
    tunnel: 'AES-256-GCM Frame',
    chunk: '128 KiB Sealed',
    route: 'Zero-Knowledge Hop',
    encryption: 'End-to-End Sealed',
    speedSec: 2.1,
  },
};

const CYCLE_STAGES = [
  { key: 'sas', label: '01 Pair ECDH · SAS Check' },
  { key: 'stream', label: '02 Streaming Verified Chunks' },
  { key: 'blake3', label: '03 BLAKE3 Root Match' },
];

export function HeroVisual() {
  const [mode, setMode] = useState<PipelineMode>('webrtc');
  const [playing, setPlaying] = useState(true);
  const [stageIdx, setStageIdx] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % CYCLE_STAGES.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [playing]);

  const spec = MODE_SPECS[mode];
  const stage = CYCLE_STAGES[stageIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#101010] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] dark:border-[#252525] pb-3.5">
        <div
          role="tablist"
          aria-label="Transport mode simulation"
          className="inline-flex items-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#F1F1F1] dark:bg-[#151515] p-0.5"
        >
          {(Object.keys(MODE_SPECS) as PipelineMode[]).map((key) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(key)}
                className={cn(
                  'relative rounded px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap shrink-0',
                  active
                    ? 'text-[#111111] dark:text-[#F5F5F5]'
                    : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="hero-mode-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                    className="absolute inset-0 rounded bg-[#FFFFFF] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#333333]"
                  />
                )}
                <span className="relative z-10">{MODE_SPECS[key].label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause transport animation' : 'Play transport animation'}
          className="inline-flex items-center gap-1.5 rounded border border-[#E5E5E5] dark:border-[#252525] px-2 py-1 font-mono text-[11px] text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5] cursor-pointer whitespace-nowrap shrink-0"
        >
          {playing ? (
            <>
              <Pause className="h-3 w-3" aria-hidden="true" />
              <span>Live</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" aria-hidden="true" />
              <span>Paused</span>
            </>
          )}
        </button>
      </div>

      <div className="my-6 grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
        <motion.div
          animate={
            playing && stage.key === 'stream'
              ? { borderColor: ['rgba(146,146,146,0.35)', 'rgba(245,245,245,0.55)', 'rgba(146,146,146,0.35)'] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#141414] p-4"
        >
          <div className="flex items-center gap-2.5 text-[#111111] dark:text-[#F5F5F5]">
            <Laptop className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium">Sender Node</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            {spec.chunk}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
            Per-chunk BLAKE3 digest
          </p>
        </motion.div>

        <div className="relative flex flex-col items-center justify-center py-2">
          <div className="relative flex w-full items-center">
            <svg
              viewBox="0 0 180 28"
              className="w-full h-7 overflow-visible text-[#111111] dark:text-[#F5F5F5]"
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="14"
                x2="180"
                y2="14"
                stroke="currentColor"
                strokeOpacity="0.22"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {playing && (
                <>
                  <motion.rect
                    width="12"
                    height="4"
                    rx="2"
                    y="12"
                    fill="currentColor"
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: [0, 168], opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: spec.speedSec,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                  <motion.rect
                    width="8"
                    height="4"
                    rx="2"
                    y="12"
                    fill="currentColor"
                    fillOpacity="0.55"
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: [0, 172], opacity: [0, 0.85, 0.85, 0] }}
                    transition={{
                      duration: spec.speedSec,
                      delay: spec.speedSec * 0.45,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </>
              )}
            </svg>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded border border-[#E5E5E5] dark:border-[#2A2A2A] bg-[#FAFAFA] dark:bg-[#151515] px-2.5 py-1 text-[11px] font-mono text-[#111111] dark:text-[#F5F5F5] whitespace-nowrap">
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{spec.tunnel}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={`${mode}-${stage.key}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-2 text-center font-mono text-[11px] text-[#666666] dark:text-[#929292]"
            >
              {stage.label}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#141414] p-4">
          <div className="flex items-center justify-between gap-2 text-[#111111] dark:text-[#F5F5F5]">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium">Receiver Node</span>
            </div>
            {stage.key === 'blake3' && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#22C55E]"
                  aria-hidden="true"
                />
              </motion.span>
            )}
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            Explicit consent gate
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[#8A8A8A] dark:text-[#626262]">
            Full-stream hash check
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="grid grid-cols-3 gap-3 border-t border-[#E5E5E5] dark:border-[#252525] pt-4 font-mono text-[11px]"
        >
          <div>
            <span className="block text-[#8A8A8A] dark:text-[#626262]">PATH</span>
            <span className="mt-0.5 block text-[#111111] dark:text-[#F5F5F5]">{spec.route}</span>
          </div>
          <div>
            <span className="block text-[#8A8A8A] dark:text-[#626262]">SECURITY</span>
            <span className="mt-0.5 block text-[#111111] dark:text-[#F5F5F5]">
              {spec.encryption}
            </span>
          </div>
          <div>
            <span className="block text-[#8A8A8A] dark:text-[#626262]">STORAGE</span>
            <span className="mt-0.5 block text-[#111111] dark:text-[#F5F5F5]">
              Zero Server Disk
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
