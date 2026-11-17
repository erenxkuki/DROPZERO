import React, { useState } from 'react';
import { Activity, Download, Trash2 } from 'lucide-react';
import { useTransfer } from '@/src/lib/dropzero/transfer-context';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { ThemeSwitcher } from '@/src/components/ui/theme-switcher';
import { SettingsSection } from '@/src/components/ui/settings-section';
import { useToast } from '@/src/components/ui/toast';

export function SettingsPage() {
  const { settings, updateSettings, clearAllLocalData, exportDiagnostics } = useTransfer();
  const { pushToast } = useToast();

  const [deviceNameDraft, setDeviceNameDraft] = useState<string | null>(null);
  const [healthResult, setHealthResult] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const displayedName = deviceNameDraft ?? settings.deviceName;

  const saveDeviceName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = displayedName.trim();
    if (!cleaned) return;
    await updateSettings({ deviceName: cleaned });
    setDeviceNameDraft(null);
    pushToast({ title: 'Device label updated', tone: 'success' });
  };

  const checkSignalingHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      const data = (await res.json()) as {
        ok?: boolean;
        service?: string;
        activeSessions?: number;
        uptimeMs?: number;
      };
      setHealthResult(
        `HTTP ${res.status} · ok=${String(data.ok)} · activeSessions=${data.activeSessions ?? 0} · uptime=${Math.round((data.uptimeMs ?? 0) / 1000)}s`
      );
      pushToast({ title: 'Signaling endpoint healthy', tone: 'success' });
    } catch {
      setHealthResult('Failed to reach /api/health');
      pushToast({ title: 'Signaling health check failed', tone: 'error' });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleDownloadDiagnostics = () => {
    const json = exportDiagnostics();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dropzero-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWipeLocalData = async () => {
    await clearAllLocalData();
    pushToast({ title: 'Cleared local IndexedDB history and checkpoints', tone: 'neutral' });
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-[#E5E5E5] dark:border-[#252525] pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
          Browser & Transport Configuration
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Settings
        </h1>
      </div>

      <SettingsSection
        title="Device Identity & Theme"
        description="Customize how this browser identifies itself to peers during pairing."
      >
        <form onSubmit={saveDeviceName} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <Input
            label="Local device label"
            value={displayedName}
            onChange={(e) => setDeviceNameDraft(e.target.value)}
            maxLength={48}
          />
          <Button type="submit" variant="primary" disabled={!displayedName.trim()}>
            Save Label
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">Appearance</p>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              Dark mode is optimized for low-glare studio environments.
            </p>
          </div>
          <ThemeSwitcher />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Transport & Chunk Tuning"
        description="Configure NAT traversal preference and initial chunk sizes."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dz-transport-pref"
              className="block text-xs font-medium text-[#111111] dark:text-[#F5F5F5] mb-1.5"
            >
              Transport Priority
            </label>
            <select
              id="dz-transport-pref"
              value={settings.preferredTransport}
              onChange={(e) =>
                updateSettings({
                  preferredTransport: e.target.value as
                    | 'auto'
                    | 'webrtc-only'
                    | 'relay-fallback',
                })
              }
              className="h-10 w-full rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#101010] px-3 text-sm text-[#111111] dark:text-[#F5F5F5]"
            >
              <option value="auto">Auto (WebRTC Direct → Encrypted Relay)</option>
              <option value="webrtc-only">Strict Direct WebRTC Only</option>
              <option value="relay-fallback">Allow Immediate Encrypted Relay Fallback</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="dz-chunk-mode"
              className="block text-xs font-medium text-[#111111] dark:text-[#F5F5F5] mb-1.5"
            >
              Chunk Sizing Strategy
            </label>
            <select
              id="dz-chunk-mode"
              value={settings.chunkSizeMode}
              onChange={(e) =>
                updateSettings({
                  chunkSizeMode: e.target.value as 'adaptive' | '256k' | '1m' | '4m',
                })
              }
              className="h-10 w-full rounded-md border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#101010] px-3 text-sm text-[#111111] dark:text-[#F5F5F5]"
            >
              <option value="adaptive">Adaptive (256 KiB – 4 MiB)</option>
              <option value="256k">256 KiB Fixed</option>
              <option value="1m">1 MiB Fixed</option>
              <option value="4m">4 MiB Fixed</option>
            </select>
          </div>
        </div>

        <Switch
          label="Discoverable on active signaling server"
          description="List open waiting rooms in the Devices directory until session expiry."
          checked={settings.discoverableOnSignaling}
          onCheckedChange={(v) => updateSettings({ discoverableOnSignaling: v })}
        />

        <Switch
          label="Require explicit receiver acceptance"
          description="Always inspect incoming file manifests and approve before transfer begins."
          checked={settings.requireExplicitAccept}
          onCheckedChange={(v) => updateSettings({ requireExplicitAccept: v })}
        />

        <Switch
          label="Remember verified peer fingerprints locally"
          description="Stores remote peer metadata and public key fingerprints only inside browser IndexedDB."
          checked={settings.rememberDevices}
          onCheckedChange={(v) => updateSettings({ rememberDevices: v })}
        />
      </SettingsSection>

      <SettingsSection
        title="Diagnostics & Local Data"
        description="Verify signaling connectivity, export anonymized session logs, or wipe local IndexedDB state."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5]">
              Signaling Health Probe
            </p>
            {healthResult && (
              <p className="mt-1 font-mono text-xs text-[#666666] dark:text-[#929292]">
                {healthResult}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" loading={checkingHealth} onClick={checkSignalingHealth}>
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Test /api/health
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E5E5E5] dark:border-[#252525]">
          <Button variant="outline" size="sm" onClick={handleDownloadDiagnostics}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Diagnostics JSON
          </Button>
          <Button variant="danger" size="sm" onClick={handleWipeLocalData}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Wipe All Local History & Devices
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
