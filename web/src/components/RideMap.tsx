'use client';

import dynamic from 'next/dynamic';
import type { MapViewProps } from './MapView';

const Inner = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="grid h-full w-full place-items-center bg-surface2 text-sm text-muted">Loading map…</div>,
});

/** Leaflet touches `window`, so the map is only ever rendered in the browser. */
export function RideMap(props: MapViewProps) {
  return <Inner {...props} />;
}
