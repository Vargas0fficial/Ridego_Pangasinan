'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

/** Streams the rider's real GPS to the server while online. */
export function useRiderGps(opts: { enabled: boolean; socket: Socket | null; onPos: (p: { lat: number; lng: number }) => void }) {
  const { enabled, socket, onPos } = opts;
  const cb = useRef(onPos);
  cb.current = onPos;
  useEffect(() => {
    if (!enabled || !socket || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        cb.current(pos);
        socket.emit('rider:location', { ...pos, heading: p.coords.heading ?? undefined });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, socket]);
}