'use client';

import { MapPin, Navigation } from 'lucide-react';
import { fmtDateTime, peso } from '@/lib/format';
import type { Ride } from '@/lib/types';

const STATUS_LABEL: Record<Ride['status'], string> = {
  searching: 'Finding rider',
  accepted: 'Rider on the way',
  arrived: 'Rider arrived',
  ongoing: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_riders: 'No riders found',
};

export function RouteLines({ ride }: { ride: Pick<Ride, 'pickup' | 'dropoff'> }) {
  return (
    <div className="relative space-y-3 pl-7">
      <span className="absolute left-[9px] top-3 h-[calc(100%-1.5rem)] w-px border-l-2 border-dotted border-line" aria-hidden />
      <div className="relative">
        <span className="absolute -left-7 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary-soft text-primary">
          <MapPin size={13} />
        </span>
        <div className="sec-title">Pickup</div>
        <div className="font-semibold leading-snug">{ride.pickup.label}</div>
      </div>
      <div className="relative">
        <span className="absolute -left-7 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-[rgb(var(--chip))] text-[rgb(var(--chip-fg))]">
          <Navigation size={11} />
        </span>
        <div className="sec-title">Destination</div>
        <div className="font-semibold leading-snug">{ride.dropoff.label}</div>
      </div>
    </div>
  );
}

export function RideHistoryCard({ ride, role }: { ride: Ride; role: 'passenger' | 'rider' }) {
  const when = ride.times.completed ?? ride.times.cancelled ?? ride.times.requested;
  const bad = ride.status === 'cancelled' || ride.status === 'no_riders';
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <span className={`tag ${bad ? 'tag-bad' : ''}`}>{STATUS_LABEL[ride.status]}</span>
        <span className="text-xs text-muted">{fmtDateTime(when)}</span>
      </div>
      <RouteLines ride={ride} />
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-muted">{ride.distanceKm.toFixed(1)} km</span>
        <span className="font-display text-lg font-extrabold">{peso(role === 'rider' ? ride.riderEarning : ride.fare)}</span>
      </div>
    </div>
  );
}
