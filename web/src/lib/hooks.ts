'use client';

import { useEffect, useState } from 'react';
import type { Pt } from './geo';

export type GeoState = { status: 'idle' | 'loading' | 'ok' | 'denied' | 'unavailable'; pos: Pt | null };

/** One-shot browser location lookup. */
export function useGeolocation(enabled = true): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'idle', pos: null });
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState({ status: 'unavailable', pos: null });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      (p) => setState({ status: 'ok', pos: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      () => setState({ status: 'denied', pos: null }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, [enabled]);
  return state;
}

/** Promise version used when the rider taps Go Online. */
export function getPosition(timeoutMs = 6000): Promise<Pt | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 },
    );
  });
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
