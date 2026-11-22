'use client';

import { ChevronRight, Search } from 'lucide-react';
import { useNearbyRiders } from '@/lib/useNearbyRiders';
import { useApp } from '@/context/AppContext';
import { useGeolocation } from '@/lib/hooks';
import { inServiceArea } from '@/lib/geo';
import { DEFAULT_CENTER, QUICK_DESTINATIONS, toPlace } from '@/lib/places';
import type { Place } from '@/lib/types';
import { RideMap } from '../RideMap';
import { Sheet } from '../ui';

export function HomeTab({ onBook, onOpenRide }: { onBook: (dest?: Place) => void; onOpenRide: () => void }) {
  const { user, ride } = useApp();
  const geo = useGeolocation();
  const center = geo.pos && inServiceArea(geo.pos) ? geo.pos : DEFAULT_CENTER;
  const nearby = useNearbyRiders(center);

  const active = ride && ['searching', 'accepted', 'arrived', 'ongoing'].includes(ride.status);

  return (
    <div className="relative h-full">
      <RideMap pickup={null} dropoff={null} riders={nearby} me={geo.pos} fitKey={`home:${center.lat}`} padBottom={260} />
      <Sheet>
        <p className="text-sm text-muted">Kumusta, {user?.name.split(' ')[0]}!</p>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Ride Anywhere in Pangasinan</h2>

        {active ? (
          <button className="btn mt-4" onClick={onOpenRide}>
            View my current ride <ChevronRight size={20} />
          </button>
        ) : (
          <button className="card mt-4 flex w-full items-center gap-3 text-left" onClick={() => onBook()}>
            <Search size={20} className="text-primary" />
            <span className="flex-1 font-semibold text-muted">Where to?</span>
            <span className="tag">{nearby.length} nearby</span>
          </button>
        )}

        <div className="sec-title mb-2 mt-4">Popular destinations</div>
        <div className="flex flex-wrap gap-2">
          {QUICK_DESTINATIONS.map((p) => (
            <button key={p.id} className="chip" onClick={() => onBook(toPlace(p))} disabled={!!active}>
              {p.label}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
