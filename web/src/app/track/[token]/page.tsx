'use client';

import { use, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api } from '@/lib/api';
import { Logo } from '@/components/Logo';
import { RideMap } from '@/components/RideMap';
import { Sheet, Spinner } from '@/components/ui';
import type { Trip } from '@/lib/types';

const LABEL: Record<Trip['status'], string> = {
  searching: 'Looking for a rider',
  accepted: 'Rider is heading to the pickup',
  arrived: 'Rider is at the pickup',
  ongoing: 'Trip in progress',
  completed: 'Trip completed safely',
  cancelled: 'Trip was cancelled',
  no_riders: 'No rider was found',
};

export default function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);

  useEffect(() => {
    let stop = false;
    api<{ trip: Trip }>(`/api/track/${token}`)
      .then((r) => !stop && setTrip(r.trip))
      .catch((e: Error) => !stop && setError(e.message));

    const s = io(`${API_URL}/track`, { transports: ['websocket', 'polling'] });
    s.on('connect', () => {
      setLive(true);
      s.emit('track:join', token);
    });
    s.on('disconnect', () => setLive(false));
    s.on('track:update', (t: Trip) => setTrip(t));
    s.on('track:location', (p: { lat: number; lng: number }) => setTrip((t) => (t ? { ...t, riderLocation: p } : t)));
    return () => {
      stop = true;
      s.removeAllListeners();
      s.disconnect();
    };
  }, [token]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none items-center justify-between border-b border-line bg-surface px-4 pb-2.5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
        <Logo size={32} />
        <span className="inline-flex items-center gap-2 text-xs font-bold text-primary-strong">
          <span className="rg-live-dot" /> {live ? 'LIVE' : 'Connecting…'}
        </span>
      </header>
      <main className="relative min-h-0 flex-1">
        {!trip && !error && (
          <div className="grid h-full place-items-center text-muted">
            <Spinner size={28} />
          </div>
        )}
        {error && (
          <div className="mx-auto max-w-sm p-8 text-center">
            <h1 className="font-display text-xl font-extrabold">Trip link not available</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </div>
        )}
        {trip && (
          <>
            <RideMap
              pickup={trip.pickup}
              dropoff={trip.dropoff}
              route={trip.geometry}
              approach={trip.status === 'accepted' ? trip.approach : null}
              rider={trip.riderLocation}
              fitKey={`${token}:${trip.status}`}
              padBottom={200}
            />
            <Sheet>
              <h1 className="font-display text-lg font-extrabold">{LABEL[trip.status]}</h1>
              <p className="mt-1 text-sm text-muted">
                {trip.pickup.label} → {trip.dropoff.label}
              </p>
              {trip.rider && (
                <div className="card mt-3">
                  <div className="font-display font-bold">Rider: {trip.rider.firstName}</div>
                  {trip.rider.vehicle && (
                    <div className="text-sm text-muted">
                      {trip.rider.vehicle.model} · {trip.rider.vehicle.color} · {trip.rider.vehicle.plate}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">Shared through RideGo Pangasinan. This link stops working shortly after the trip ends.</p>
            </Sheet>
          </>
        )}
      </main>
    </div>
  );
}
