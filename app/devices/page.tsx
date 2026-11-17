'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTransfer } from '@/lib/dropzero/transfer-context';
import { DeviceCard } from '@/components/dropzero/device-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';

export default function DevicesPage() {
  const {
    localDevice,
    settings,
    updateSettings,
    remotePeer,
    sessionId,
    pairingCode,
    discoverableSessions,
    refreshDiscovery,
    joinSessionByCode,
    rememberedDevices,
    forgetDevice,
  } = useTransfer();

  const { toast } = useToast();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [pairInput, setPairInput] = useState('');
  const nameValue = nameDraft ?? settings.deviceName;

  useEffect(() => {
    refreshDiscovery();
  }, [refreshDiscovery]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    await updateSettings({ deviceName: trimmed });
    setNameDraft(null);
    toast({ title: 'Local device renamed', description: trimmed, variant: 'success' });
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await joinSessionByCode(pairInput);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
          Devices
        </h1>
        <p className="mt-1 text-sm text-[#666666] dark:text-[#929292]">
          Manage your local browser identity, pair active sessions, and control optional remembered devices. Private IPs and hardware IDs are never collected.
        </p>
      </div>

      {/* Local device + rename */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DeviceCard
          name={localDevice.deviceName}
          deviceType={localDevice.deviceType}
          platform={localDevice.platform}
          statusLabel={sessionId ? `Session ${pairingCode}` : 'Ready'}
          capabilities={localDevice.capabilities}
          isCurrent
        />

        <form
          onSubmit={handleRename}
          className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-4 flex flex-col justify-between gap-3"
        >
          <Input
            label="Rename local device"
            value={nameValue}
            maxLength={48}
            onChange={(e) => setNameDraft(e.target.value)}
            hint="Visible only to peers you pair with during an active session."
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="secondary">
              Save name
            </Button>
          </div>
        </form>
      </section>

      {/* Pair a device manually or from discovery */}
      <section className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
              Pair a device
            </h2>
            <p className="text-xs text-[#666666] dark:text-[#929292]">
              Enter a 6-character pairing code or connect to an active discoverable session.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refreshDiscovery}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Scan signaling</span>
          </Button>
        </div>

        <form onSubmit={handlePairSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
          <Input
            aria-label="Pairing code"
            placeholder="6-character code"
            value={pairInput}
            maxLength={6}
            mono
            onChange={(e) => setPairInput(e.target.value.toUpperCase())}
          />
          <Button type="submit" disabled={pairInput.trim().length !== 6}>
            Pair session
          </Button>
        </form>

        {discoverableSessions.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            {discoverableSessions.map((sess) => (
              <DeviceCard
                key={sess.pairingCode}
                name={sess.deviceName}
                deviceType={sess.deviceType}
                platform={sess.platform}
                statusLabel={`Code ${sess.pairingCode} · ${sess.mode}`}
                connectLabel="Connect"
                onConnect={() => joinSessionByCode(sess.pairingCode)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Current active remote peer */}
      {remotePeer && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5]">
            Active session peer
          </h2>
          <DeviceCard
            name={remotePeer.deviceName}
            deviceType={remotePeer.deviceType}
            platform={remotePeer.platform}
            statusLabel="Connected"
            fingerprint={remotePeer.fingerprint}
            capabilities={remotePeer.capabilities}
          />
        </section>
      )}

      {/* Optional remembered devices */}
      <section className="flex flex-col gap-4">
        <div className="rounded-lg border border-[#E5E5E5] dark:border-[#252525] bg-[#FFFFFF] dark:bg-[#111111] p-5">
          <Switch
            checked={settings.rememberDevices}
            onCheckedChange={(val) => updateSettings({ rememberDevices: val })}
            label="Remember paired devices locally"
            description="Optional. Keep off to use strictly temporary sessions without storing peer fingerprints in IndexedDB."
          />
        </div>

        {rememberedDevices.length === 0 ? (
          <EmptyState
            title="No remembered devices"
            description="Temporary sessions leave no device records behind. Enable local device memory above only if you want to track previously paired fingerprints."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rememberedDevices.map((dev) => (
              <DeviceCard
                key={dev.id}
                name={dev.deviceName}
                deviceType={dev.deviceType}
                platform={dev.platform}
                statusLabel="Remembered locally"
                fingerprint={dev.fingerprint}
                lastSessionAt={dev.lastSessionAt}
                capabilities={dev.capabilities}
                onRemove={() => forgetDevice(dev.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
