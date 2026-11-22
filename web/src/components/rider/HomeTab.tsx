'use client';

import { useState } from 'react';
import { Power } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { getPosition } from '@/lib/hooks';
import type { User } from '@/lib/types';
import { RideMap } from '../RideMap';
import { Avatar, Rating, Sheet, Spinner } from '../ui';

export function RiderHomeTab({ onGoActive }: { onGoActive: () => void }) {
  const { user, setUser, ride, livePos, setLivePos, fail, toast } = useApp();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const online = user.isOnline;
  const hasRide = !!ride && ['accepted', 'arrived', 'ongoing'].includes(ride.status);

  const setOnline = async (next: boolean) => {
    setBusy(true);
    try {
      let pos: { lat: number; lng: number } | null = null;
      if (next) {
        pos = await getPosition();
        if (!pos) {
          toast('Turn on your location to go online. RideGo Pangasinan needs it to match you with nearby passengers.', 'error');
          setBusy(false);
          return;
        }
      }
      const r = await api<{ user: User }>('/api/rider/online', { body: { online: next, lat: pos?.lat, lng: pos?.lng } });
      setUser(r.user);
      if (pos) setLivePos(pos);
      toast(next ? "You're online. Looking for ride requests." : "You're offline.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-full">
      <RideMap pickup={null} dropoff={null} me={livePos} fitKey={`rh:${livePos ? 1 : 0}`} padBottom={240} />
      <Sheet>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size={52} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-extrabold">{user.name}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              <Rating value={user.rating} />
              {user.vehicle && (
                <span>
                  {user.vehicle.model} · {user.vehicle.plate}
                </span>
              )}
            </div>
            <div className="text-[13px] text-muted">{user.completedRides.toLocaleString()} rides</div>
          </div>
        </div>

        <div className={`mt-4 rounded-2xl p-4 text-center ${online ? 'bg-primary-soft' : 'bg-surface2'}`}>
          {online && (
            <div className="rg-radar relative mx-auto mb-3 h-20 w-20">
              <i />
              <i />
              <i />
              <div className="absolute inset-[26px] rounded-full bg-primary" />
            </div>
          )}
          <h2 className={`font-display text-xl font-extrabold ${online ? 'text-primary-strong' : ''}`}>{online ? "You're Online" : "You're Offline"}</h2>
          <p className={`text-sm ${online ? 'text-primary-strong' : 'text-muted'}`}>
            {online ? 'Looking for nearby ride requests…' : 'Go online to start receiving ride requests.'}
          </p>
        </div>

        {hasRide ? (
          <button className="btn mt-3" onClick={onGoActive}>
            Go to active ride
          </button>
        ) : online ? (
          <button className="btn btn-ghost mt-3" onClick={() => setOnline(false)} disabled={busy}>
            {busy ? <Spinner /> : <Power size={20} />} Go Offline
          </button>
        ) : (
          <button className="btn mt-3" onClick={() => setOnline(true)} disabled={busy}>
            {busy ? <Spinner /> : <Power size={20} />} Go Online
          </button>
        )}
      </Sheet>
    </div>
  );
}