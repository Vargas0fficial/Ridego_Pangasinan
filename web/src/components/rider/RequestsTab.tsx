'use client';

import { Inbox } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { fmtKm, peso } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import { EmptyState } from '../ui';
import { secondsLeft } from './RequestModal';

export function RequestsTab({ online }: { online: boolean }) {
  const { offers } = useApp();
  const now = useNow(500);
  if (offers.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={28} />}
        title={online ? 'No requests right now' : "You're offline"}
        text={online ? 'New ride requests appear here and as a pop-up. Stay on this app to receive them.' : 'Go online from Home to receive ride requests.'}
      />
    );
  }
  return (
    <div className="mx-auto h-full max-w-xl space-y-3 overflow-y-auto p-4">
      <h2 className="font-display text-xl font-extrabold">Ride requests</h2>
      {offers.map((o) => (
        <div key={o.rideId} className="card">
          <div className="flex items-center justify-between">
            <span className="tag">{Math.ceil(secondsLeft(o, now))}s left</span>
            <span className="font-display font-extrabold text-primary-strong">{peso(o.riderEarning)}</span>
          </div>
          <div className="mt-2 font-semibold">{o.pickup.label}</div>
          <div className="text-sm text-muted">to {o.dropoff.label}</div>
          <div className="mt-1 text-[13px] text-muted">
            {o.distanceKm.toFixed(1)} km trip · pickup {fmtKm(o.toPickupKm)} away
          </div>
        </div>
      ))}
    </div>
  );
}
