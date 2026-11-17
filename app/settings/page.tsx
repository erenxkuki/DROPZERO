'use client';

import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { useTransfer } from '@/lib/dropzero/transfer-context';
import { useTheme } from '@/components/ui/theme-switcher';
import { SettingsSection } from '@/components/ui/settings-section';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PROTOCOL_VERSION } from '@/lib/dropzero/protocol';

interface ServerHealth {
  ok: boolean;
  service: string;
  uptimeMs: number;
  activeSessions: number;
  sessionTtlMs: number;
}

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    metrics,
    signalingConnected,
    clearAllLocalData,
    logs,
    exportDiagnostics,
  } = useTransfer();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [deviceNameDraft, setDeviceNameDraft] = useState<string | null>(null);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [checkingNet, setCheckingNet] = useState(false);
  const deviceNameValue = deviceNameDraft ?? settings.deviceName;

  const checkNetworkHealth = async () => {
    setCheckingNet(true);
    try {
      const res = await fetch('/api/health');
      const data = (await res.json()) as ServerHealth;
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setCheckingNet(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: ServerHealth) => {
        if (active) setHealth(data);
      })
      .catch(() => {
        if (active) setHealth(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleExportDiagnostics = () => {
    const json = exportDiagnostics();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dropzero-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Diagnostics exported', variant: 'success' });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#666666] dark:text-[#929292]">
          Local preferences are saved only on this device. Security protections such as peer authentication and BLAKE3 verification cannot be disabled.
        </p>
      </div>

      {/* GENERAL */}
      <SettingsSection title="General" description="Appearance, device label, and browser preferences.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">Theme</p>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              Dark mode is default for low-glare studio environments.
            </p>
          </div>
          <Tabs
            value={theme}
            onChange={(val) => setTheme(val as 'dark' | 'light')}
            items={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              label="Local device name"
              value={deviceNameValue}
              maxLength={48}
              onChange={(e) => setDeviceNameDraft(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await updateSettings({ deviceName: deviceNameValue.trim() || 'Web Browser' });
              setDeviceNameDraft(null);
              toast({ title: 'Device name updated', variant: 'success' });
            }}
          >
            Save
          </Button>
        </div>

        <Switch
          checked={settings.discoverableOnSignaling}
          onCheckedChange={(val) => updateSettings({ discoverableOnSignaling: val })}
          label="Show session in active nearby discovery"
          description="Allows other tabs or peers on the signaling server to see your pairing code without typing it manually."
        />
      </SettingsSection>

      {/* TRANSFER */}
      <SettingsSection title="Transfer" description="Chunking, concurrency, and acceptance behavior.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              Chunk sizing strategy
            </p>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              Adaptive sizing selects 64 KiB on relay and 256 KiB+ on direct WebRTC channels.
            </p>
          </div>
          <Tabs
            value={settings.chunkSizeMode}
            onChange={(val) =>
              updateSettings({ chunkSizeMode: val as 'adaptive' | '256k' | '1m' | '4m' })
            }
            items={[
              { value: 'adaptive', label: 'Adaptive' },
              { value: '256k', label: '256 KiB' },
              { value: '1m', label: '1 MiB' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              Preferred transport
            </p>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              Auto attempts direct WebRTC first and switches to E2E encrypted relay only if ICE fails.
            </p>
          </div>
          <Tabs
            value={settings.preferredTransport}
            onChange={(val) =>
              updateSettings({
                preferredTransport: val as 'auto' | 'webrtc-only' | 'relay-fallback',
              })
            }
            items={[
              { value: 'auto', label: 'Auto (P2P + Relay)' },
              { value: 'webrtc-only', label: 'Direct WebRTC only' },
            ]}
          />
        </div>

        <Switch
          checked={settings.autoResume}
          onCheckedChange={(val) => updateSettings({ autoResume: val })}
          label="Persist recovery checkpoints in IndexedDB"
          description="Tracks verified chunk indices locally so interrupted sessions can inspect resume progress."
        />

        <div className="flex items-center justify-between text-xs text-[#666666] dark:text-[#929292]">
          <span>Explicit acceptance required before receiving files</span>
          <span className="font-mono text-[#111111] dark:text-[#F5F5F5]">Always enforced</span>
        </div>
      </SettingsSection>

      {/* NETWORK */}
      <SettingsSection title="Network" description="Live signaling connectivity and transport diagnostics.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[#111111] dark:text-[#F5F5F5]">
              Signaling service status
            </span>
            <span className="font-mono text-[#666666] dark:text-[#929292]">
              {health
                ? `Reachable · ${health.activeSessions} active ephemeral session(s) · TTL ${Math.round(health.sessionTtlMs / 60000)}m`
                : 'Unable to reach /api/health'}
            </span>
          </div>
          <Button size="sm" variant="outline" loading={checkingNet} onClick={checkNetworkHealth}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Check</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="block text-[#666666] dark:text-[#929292]">Active transport</span>
            <span className="font-mono text-[#111111] dark:text-[#F5F5F5]">
              {metrics.transport}
            </span>
          </div>
          <div>
            <span className="block text-[#666666] dark:text-[#929292]">Signaling socket</span>
            <span className="font-mono text-[#111111] dark:text-[#F5F5F5]">
              {signalingConnected ? 'Connected' : 'Standby'}
            </span>
          </div>
          <div>
            <span className="block text-[#666666] dark:text-[#929292]">ICE candidate</span>
            <span className="font-mono text-[#111111] dark:text-[#F5F5F5]">
              {metrics.iceCandidateType || 'None'}
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* PRIVACY */}
      <SettingsSection title="Privacy" description="Local metadata controls and zero-cloud policy.">
        <Switch
          checked={settings.rememberDevices}
          onCheckedChange={(val) => updateSettings({ rememberDevices: val })}
          label="Remember paired devices"
          description="Store remote device names and ECDH fingerprints locally in IndexedDB."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              Clear all local browser metadata
            </p>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              Deletes transfer history, remembered devices, and recovery checkpoints from IndexedDB.
            </p>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              await clearAllLocalData();
              toast({ title: 'Local metadata cleared', variant: 'success' });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear local data</span>
          </Button>
        </div>
      </SettingsSection>

      {/* ADVANCED */}
      <SettingsSection title="Advanced" description="Protocol inspection and sanitized local diagnostics.">
        <Switch
          checked={settings.debugLogging}
          onCheckedChange={(val) => updateSettings({ debugLogging: val })}
          label="Verbose session event log"
          description="Captures local state transitions and ICE status events without file contents or keys."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs">
            <p className="font-medium text-[#111111] dark:text-[#F5F5F5]">
              Protocol version {PROTOCOL_VERSION}
            </p>
            <p className="text-[#666666] dark:text-[#929292]">
              16-byte binary header + 32-byte BLAKE3 chunk digest · ECDH P-256 SAS
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleExportDiagnostics}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export diagnostics</span>
          </Button>
        </div>

        {settings.debugLogging && (
          <div className="rounded border border-[#E5E5E5] dark:border-[#252525] bg-[#FAFAFA] dark:bg-[#0B0B0B] p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-[#666666] dark:text-[#929292]">
            {logs.length === 0 ? (
              <p>No session events recorded yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-0.5">
                  <span>{new Date(log.ts).toLocaleTimeString()}</span>{' '}
                  <span className="text-[#111111] dark:text-[#F5F5F5]">[{log.level}]</span>{' '}
                  <span>{log.event}</span>
                  {log.detail ? <span> — {log.detail}</span> : null}
                </div>
              ))
            )}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
