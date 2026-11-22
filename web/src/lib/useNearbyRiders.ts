'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import type { Pt } from './geo';

/** Anonymous nearby online riders, refreshed every few seconds. Pass null to pause. */
export function useNearbyRiders(at: Pt | null, intervalMs = 5000): Pt[] {
  const [riders, setRiders] = useState<Pt[]>([]);
  const lat = at?.lat;
  const lng = at?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      setRiders([]);
      return;
    }
    let stop = false;
    const load = () =>
      api<{ riders: Pt[] }>(`/api/rides/nearby-riders?lat=${lat}&lng=${lng}`)
        .then((r) => !stop && setRiders(r.riders))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, intervalMs);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [lat, lng, intervalMs]);
  return riders;
}
