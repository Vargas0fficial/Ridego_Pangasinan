'use client';

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { Ride } from '@/lib/types';
import { RideHistoryCard } from '../RideCards';
import { EmptyState, Spinner } from '../ui';

export function RidesTab({ role = 'passenger' }: { role?: 'passenger' | 'rider' }) {
  const { ride } = useApp();
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false;
    api<{ rides: Ride[] }>('/api/rides/history')
      .then((r) => !stop && setRides(r.rides))
      .catch((e: Error) => !stop && setError(e.message));
    return () => {
      stop = true;
    };
    // reload when the current ride finishes so it shows up here
  }, [ride?.status]);

  if (error) return <p className="p-6 text-center text-sm text-danger">{error}</p>;
  if (!rides)
    return (
      <div className="grid h-full place-items-center text-muted">
        <Spinner size={26} />
      </div>
    );
  if (rides.length === 0) return <EmptyState icon={<Receipt size={28} />} title="No rides yet" text="Your completed and cancelled rides will show up here." />;

  return (
    <div className="mx-auto h-full max-w-xl space-y-3 overflow-y-auto p-4">
      <h2 className="font-display text-xl font-extrabold">My rides</h2>
      {rides.map((r) => (
        <RideHistoryCard key={r.id} ride={r} role={role} />
      ))}
    </div>
  );
}
