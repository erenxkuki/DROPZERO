import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, RefreshCw, Trash2 } from 'lucide-react';
import { useTransfer } from '@/src/lib/dropzero/transfer-context';
import { formatTimestamp } from '@/src/lib/dropzero/format';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/states';
import { DeviceCard } from '@/src/components/dropzero/device-card';

export function DevicesPage() {
  const navigate = useNavigate();
  const {
    localDevice,
    discoverableSessions,
    refreshDiscovery,
    rememberedDevices,
    forgetDevice,
  } = useTransfer();

  useEffect(() => {
    refreshDiscovery();
  }, [refreshDiscovery]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#252525] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#666666] dark:text-[#929292]">
            Device Directory & Signaling Discovery
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F5F5F5]">
            Devices
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={refreshDiscovery}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Scan Active Rooms
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#929292]">
          This Device
        </h2>
        <DeviceCard
          active
          name={localDevice.deviceName}
          deviceType={localDevice.deviceType}
          platform={localDevice.platform}
          subtitle={`Local ID ${localDevice.deviceId}`}
          capabilities={localDevice.capabilities}
          actionLabel="Rename in Settings"
          onAction={() => navigate('/settings')}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#929292]">
            Active Discoverable Sessions
          </h2>
          <span className="font-mono text-xs text-[#8A8A8A] dark:text-[#626262] tabular-nums">
            {discoverableSessions.length} active
          </span>
        </div>

        {discoverableSessions.length === 0 ? (
          <EmptyState
            icon={<Laptop className="h-4 w-4" aria-hidden="true" />}
            title="No discoverable peers waiting"
            description="Start a send or receive session with discovery enabled on another device to see it appear here automatically."
            action={
              <Button size="sm" variant="primary" onClick={() => navigate('/transfer')}>
                Open Transfer Console
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoverableSessions.map((sess) => (
              <DeviceCard
                key={sess.pairingCode}
                name={sess.deviceName}
                deviceType={sess.deviceType}
                platform={sess.platform}
                subtitle={`Code ${sess.pairingCode} · ${sess.mode === 'send' ? 'Ready to send' : 'Waiting to receive'}`}
                actionLabel="Connect"
                onAction={() => navigate(`/transfer?pair=${sess.pairingCode}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#929292]">
            Remembered Devices (Local IndexedDB Only)
          </h2>
          <span className="font-mono text-xs text-[#8A8A8A] dark:text-[#626262] tabular-nums">
            {rememberedDevices.length} saved
          </span>
        </div>

        {rememberedDevices.length === 0 ? (
          <EmptyState
            title="No remembered peers stored"
            description="Peer identities are ephemeral by default. Enable 'Remember verified peers locally' in Settings if you want recent public-key fingerprints stored on this browser."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rememberedDevices.map((dev) => (
              <DeviceCard
                key={dev.id}
                name={dev.deviceName}
                deviceType={dev.deviceType}
                platform={dev.platform}
                subtitle={`Last session ${formatTimestamp(dev.lastSessionAt)}`}
                fingerprint={dev.fingerprint}
                capabilities={dev.capabilities}
                secondaryAction={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => forgetDevice(dev.id)}
                    aria-label={`Forget ${dev.deviceName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
