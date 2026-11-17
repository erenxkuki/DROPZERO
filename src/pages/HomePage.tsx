import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe,
  HardDrive,
  Laptop,
  Lock,
  Monitor,
  Network,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform, type Variants } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';
import { HeroVisual } from '@/src/components/dropzero/hero-visual';
import { TransferWidget } from '@/src/components/dropzero/transfer-widget';

const HEADLINE_WORDS = ['Transfer', 'without', 'limits.'];

const HERO_EASE = [0.16, 1, 0.3, 1] as const;

const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.46, ease: HERO_EASE },
  },
};

const heroWordGroupVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.065,
    },
  },
};

const heroWordVariants: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: '0%',
    transition: { duration: 0.48, ease: HERO_EASE },
  },
};

const heroStaggerRowVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Stage locally',
    desc: 'Select files or nested folders. Nothing uploads; metadata stays strictly in browser memory.',
    detail: 'Supports recursive directory trees, multiple files, and sanitized relative paths.',
  },
  {
    step: '02',
    title: 'Pair & verify SAS',
    desc: 'Exchange a 6-character code or scan QR. Both peers derive a 6-digit ECDH SAS code.',
    detail: 'HKDF-SHA256 binds the ephemeral ECDH keypair directly to the active session ID.',
  },
  {
    step: '03',
    title: 'Direct WebRTC stream',
    desc: 'Chunks stream peer-to-peer with backpressure control, escalating to E2E relay if NAT blocks ICE.',
    detail: 'bufferedAmountLowThreshold prevents heap growth during multi-gigabyte streaming.',
  },
  {
    step: '04',
    title: 'BLAKE3 verified write',
    desc: 'Every chunk and the full file digest are verified with BLAKE3 before saving locally.',
    detail: '32-byte per-chunk digest headers validate payload integrity frame by frame.',
  },
];

const PLATFORMS = [
  {
    id: 'web',
    label: 'Browser',
    icon: Globe,
    engine: 'WebRTC DataChannel + WebCrypto ECDH P-256 + WASM BLAKE3',
    spec: 'Zero install across Chromium, Firefox, and Safari.',
  },
  {
    id: 'linux',
    label: 'Linux',
    icon: Terminal,
    engine: 'Rust Quinn QUIC (TLS 1.3 ALPN) + Tauri v2 Desktop Shell',
    spec: 'Direct random-access filesystem I/O without browser memory limits.',
  },
  {
    id: 'macos',
    label: 'macOS',
    icon: Laptop,
    engine: 'Universal Apple Silicon / x64 Rust Core + WebRTC Parity',
    spec: 'Interoperates directly with Windows, Linux, Android, and Web peers.',
  },
  {
    id: 'windows',
    label: 'Windows',
    icon: Monitor,
    engine: 'Tauri v2 Native App + Headless dropzero-cli Binary',
    spec: 'Strict path traversal rejection strips drive prefixes and parent segments.',
  },
  {
    id: 'android',
    label: 'Android',
    icon: Smartphone,
    engine: 'Instant QR Camera Pairing + Mobile Web Transfer Console',
    spec: 'Scan pairing codes directly from desktop screens with zero account login.',
  },
];

const COMPARISON_ROWS = [
  {
    capability: 'Server file storage',
    dropzero: 'Zero (Direct P2P stream)',
    cloud: 'Stored on third-party disk',
    airdrop: 'Direct local radio',
  },
  {
    capability: 'Cross-platform',
    dropzero: 'Windows · Linux · macOS · Android · Web',
    cloud: 'Browser / app',
    airdrop: 'Single vendor hardware only',
  },
  {
    capability: 'Account requirement',
    dropzero: 'None (Ephemeral ECDH keys)',
    cloud: 'Email & quota paywalls',
    airdrop: 'Vendor OS account',
  },
  {
    capability: 'Cryptographic verification',
    dropzero: '6-digit SAS + per-chunk BLAKE3',
    cloud: 'Opaque server TLS',
    airdrop: 'Proprietary handshake',
  },
];

const PILLARS = [
  {
    icon: Lock,
    title: 'Ephemeral End-to-End Keys',
    body: 'Every session generates fresh ECDH P-256 keys in browser WebCrypto. Even on relay fallback, frames are sealed with AES-256-GCM before leaving your device.',
  },
  {
    icon: Zap,
    title: 'Backpressure & Adaptive Chunks',
    body: 'DataChannel bufferedAmountLowThreshold throttling prevents memory spikes while adapting chunk sizes from 256 KiB to 4 MiB.',
  },
  {
    icon: ShieldCheck,
    title: 'Receiver Acceptance Gate',
    body: 'Peers inspect sender device name, file manifest, sizes, and SAS code before a single byte of payload is transmitted.',
  },
  {
    icon: Network,
    title: 'Honest Transport Reporting',
    body: 'Telemetry surfaces actual RTCPeerConnection.getStats() measurements — never simulated throughput or synthetic progress bars.',
  },
  {
    icon: HardDrive,
    title: 'Local IndexedDB Persistence',
    body: 'History, recovery checkpoints, and preferences live strictly in your browser’s IndexedDB and can be wiped cleanly in one click.',
  },
  {
    icon: Terminal,
    title: 'Rust Core + Web Parity',
    body: 'Paired with a modular Rust workspace (QUIC, CLI, Tauri v2 desktop, signaling, and encrypted relay) speaking the exact same protocol.',
  },
];

const FAQS = [
  {
    q: 'Do files ever pass through or save onto your server?',
    a: 'No. In direct WebRTC/QUIC mode, file chunks move peer-to-peer over DTLS or TLS 1.3. The signaling server only holds temporary 6-character pairing codes in RAM for up to 10 minutes. Even if strict corporate NAT triggers the WebSocket relay fallback, frames are sealed client-side with AES-256-GCM before transmission.',
  },
  {
    q: 'What prevents someone else from sending unsolicited files to my browser?',
    a: 'Every session derives an independent 6-digit SAS verification code from ECDH key exchange, and the transfer state machine stays in AWAITING_ACCEPTANCE until the receiving user explicitly inspects the manifest and clicks Verify & Accept Files.',
  },
  {
    q: 'Why does DROPZERO verify both individual chunks and the full file with BLAKE3?',
    a: 'Per-chunk 32-byte digests in the 48-byte binary frame header catch packet corruption immediately during transfer, while the final streaming BLAKE3 root guarantees the assembled file matches byte-for-byte before generating the download blob.',
  },
  {
    q: 'Can I compile the native Rust CLI and Tauri v2 desktop client?',
    a: 'Yes. The entire Rust Cargo workspace (dz-core, dropzero-cli, dropzero-desktop, signaling, and relay) is included inside /dropzero under dual MIT / Apache-2.0 licensing.',
  },
];

const VIEWPORT_ONCE = { once: true, amount: 0.18 } as const;

export function HomePage() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const gridShiftY = useTransform(scrollYProgress, [0, 1], [0, 56]);

  const [activeStep, setActiveStep] = useState(0);
  const [activePlatform, setActivePlatform] = useState('web');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const selectedPlatform = PLATFORMS.find((p) => p.id === activePlatform) || PLATFORMS[0];

  return (
    <div className="relative overflow-x-clip">
      <div
        ref={heroRef}
        className="relative border-b border-[#E5E5E5] dark:border-[#252525]"
      >
        <motion.div
          style={{ y: gridShiftY }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.38] dark:opacity-[0.22] [background-image:linear-gradient(to_right,#D4D4D4_1px,transparent_1px),linear-gradient(to_bottom,#D4D4D4_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,#222222_1px,transparent_1px),linear-gradient(to_bottom,#222222_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 py-12 sm:py-16">
          <motion.section
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
          >
            <motion.div variants={heroContainerVariants} className="lg:col-span-6 space-y-6">
              <motion.p
                variants={heroItemVariants}
                className="font-mono text-xs uppercase tracking-[0.18em] text-[#666666] dark:text-[#929292]"
              >
                Protocol dz-p2p/1.0 · Zero Cloud Storage
              </motion.p>

              <motion.h1
                variants={heroWordGroupVariants}
                className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.06] text-[#111111] dark:text-[#F5F5F5]"
              >
                {HEADLINE_WORDS.map((word) => (
                  <span key={word} className="inline-block overflow-hidden mr-[0.26em] align-bottom">
                    <motion.span variants={heroWordVariants} className="inline-block">
                      {word}
                    </motion.span>
                  </span>
                ))}
              </motion.h1>

              <motion.p
                variants={heroItemVariants}
                className="text-base sm:text-lg text-[#666666] dark:text-[#929292] leading-relaxed max-w-xl"
              >
                Your devices. Your files. Your connection. Send folders and full-resolution media
                directly between peers with ephemeral ECDH encryption and BLAKE3 integrity
                verification — no accounts, no ads, and no cloud upload step.
              </motion.p>

              <motion.div
                variants={heroStaggerRowVariants}
                className="flex flex-wrap items-center gap-3 pt-1"
              >
                <motion.div variants={heroItemVariants}>
                  <Link to="/transfer">
                    <Button size="lg" variant="primary" className="group">
                      Open Transfer Workspace
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Button>
                  </Link>
                </motion.div>
                <motion.div variants={heroItemVariants}>
                  <Link to="/security">
                    <Button size="lg" variant="outline">
                      Read Security Model
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                variants={heroStaggerRowVariants}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E5E5E5] dark:border-[#252525]"
              >
                <motion.div variants={heroItemVariants}>
                  <p className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                    File Size Cap
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                    Streaming / No cap
                  </p>
                </motion.div>
                <motion.div variants={heroItemVariants}>
                  <p className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                    Integrity
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                    Per-chunk BLAKE3
                  </p>
                </motion.div>
                <motion.div variants={heroItemVariants} className="col-span-2 sm:col-span-1">
                  <p className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] dark:text-[#626262]">
                    Cost & Accounts
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
                    Free forever · Zero login
                  </p>
                </motion.div>
              </motion.div>

              <motion.div variants={heroItemVariants}>
                <HeroVisual />
              </motion.div>
            </motion.div>

            <motion.div variants={heroItemVariants} className="lg:col-span-6">
              <TransferWidget compact />
            </motion.div>
          </motion.section>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 space-y-24">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
              Engineered for Direct Path
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
              Four deterministic steps from selection to verified save.
            </h2>
          </div>

          <div className="relative">
            <svg
              aria-hidden="true"
              className="hidden lg:block absolute top-8 left-8 right-8 h-[2px] w-[calc(100%-4rem)] pointer-events-none"
              viewBox="0 0 1000 2"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="1"
                x2="1000"
                y2="1"
                stroke="currentColor"
                strokeOpacity="0.14"
                strokeWidth="2"
              />
              <motion.line
                x1="0"
                y1="1"
                x2="1000"
                y2="1"
                stroke="currentColor"
                strokeOpacity="0.55"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {WORKFLOW_STEPS.map((item, idx) => {
                const isSelected = activeStep === idx;
                return (
                  <motion.button
                    key={item.step}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{
                      duration: 0.38,
                      delay: idx * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ y: -3 }}
                    className={cn(
                      'relative text-left rounded-lg border p-5 transition-colors duration-150 cursor-pointer',
                      isSelected
                        ? 'border-[#111111] dark:border-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#151515]'
                        : 'border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#8A8A8A] dark:text-[#626262] tabular-nums">
                        {item.step}
                      </span>
                      {isSelected && (
                        <motion.span
                          layoutId="workflow-step-dot"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="h-1.5 w-1.5 rounded-full bg-[#111111] dark:bg-[#F5F5F5]"
                        />
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-medium text-[#111111] dark:text-[#F5F5F5]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
                      {item.desc}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mt-4 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#101010] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono text-[#111111] dark:text-[#F5F5F5]">
                  Step {WORKFLOW_STEPS[activeStep].step} · {WORKFLOW_STEPS[activeStep].title}
                </span>
                <span className="text-[#666666] dark:text-[#929292]">
                  {WORKFLOW_STEPS[activeStep].detail}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 border-t border-[#E5E5E5] dark:border-[#252525] pt-16"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
                Unified Protocol
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
                Every device on your desk, connected seamlessly.
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Target platform details"
              className="inline-flex flex-wrap items-center gap-1 rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#F1F1F1] dark:bg-[#101010] p-1"
            >
              {PLATFORMS.map((plat) => {
                const active = plat.id === activePlatform;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActivePlatform(plat.id)}
                    className={cn(
                      'relative inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0',
                      active
                        ? 'text-[#111111] dark:text-[#F5F5F5]'
                        : 'text-[#666666] dark:text-[#929292] hover:text-[#111111] dark:hover:text-[#F5F5F5]'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="platform-tab-bg"
                        transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                        className="absolute inset-0 rounded bg-[#FFFFFF] dark:bg-[#1D1D1D] border border-[#E5E5E5] dark:border-[#303030]"
                      />
                    )}
                    <plat.icon className="relative z-10 h-3.5 w-3.5" aria-hidden="true" />
                    <span className="relative z-10">{plat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPlatform.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515]">
                  <selectedPlatform.icon
                    className="h-5 w-5 text-[#111111] dark:text-[#F5F5F5]"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#111111] dark:text-[#F5F5F5]">
                    {selectedPlatform.label} Target · {selectedPlatform.engine}
                  </h3>
                  <p className="mt-1 text-xs text-[#666666] dark:text-[#929292]">
                    {selectedPlatform.spec}
                  </p>
                </div>
              </div>
              <Link to="/download" className="shrink-0">
                <Button size="sm" variant="outline">
                  Target Matrix
                </Button>
              </Link>
            </motion.div>
          </AnimatePresence>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8 border-t border-[#E5E5E5] dark:border-[#252525] pt-16"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
              Architecture Comparison
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
              Built against cloud-upload lock-in.
            </h2>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] font-mono uppercase tracking-wider text-[#666666] dark:text-[#929292]">
                  <th className="px-5 py-3.5">Capability</th>
                  <th className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">DROPZERO</th>
                  <th className="px-5 py-3.5">Cloud Drive / File Hosts</th>
                  <th className="px-5 py-3.5">Ecosystem-Locked AirDrop</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#252525] text-[#666666] dark:text-[#929292]">
                {COMPARISON_ROWS.map((row, idx) => (
                  <motion.tr
                    key={row.capability}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: 0.32, delay: idx * 0.06 }}
                    className="hover:bg-[#FAFAFA] dark:hover:bg-[#151515]/70 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-[#111111] dark:text-[#F5F5F5]">
                      {row.capability}
                    </td>
                    <td className="px-5 py-3.5 text-[#111111] dark:text-[#F5F5F5]">
                      {row.dropzero}
                    </td>
                    <td className="px-5 py-3.5">{row.cloud}</td>
                    <td className="px-5 py-3.5">{row.airdrop}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[#E5E5E5] dark:border-[#252525] pt-16">
          {PILLARS.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: 0.36, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className="group rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5 transition-colors hover:border-[#D4D4D4] dark:hover:border-[#3A3A3A]"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#151515] transition-transform duration-200 group-hover:scale-105">
                <card.icon className="h-4 w-4 text-[#111111] dark:text-[#F5F5F5]" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
                {card.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
                {card.body}
              </p>
            </motion.div>
          ))}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 border-t border-[#E5E5E5] dark:border-[#252525] pt-16"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
              Technical FAQ
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
              Protocol & security answers.
            </h2>
          </div>

          <div className="divide-y divide-[#E5E5E5] dark:divide-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[#111111] dark:text-[#F5F5F5] cursor-pointer hover:bg-[#FAFAFA] dark:hover:bg-[#151515]/60 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-[#666666] dark:text-[#929292] transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-xs leading-relaxed text-[#666666] dark:text-[#929292]">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
              Ready to move files without an intermediary?
            </h2>
            <p className="mt-1.5 text-sm text-[#666666] dark:text-[#929292]">
              Open the full workspace or review the protocol specification and Rust workspace source.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/transfer">
              <Button variant="primary" className="group">
                Launch Transfer
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
            </Link>
            <Link to="/download">
              <Button variant="outline">
                <Check className="h-4 w-4" aria-hidden="true" />
                Desktop & CLI
              </Button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
