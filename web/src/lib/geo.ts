import type { LatLngT } from './types';

export type Pt = { lat: number; lng: number };

export function haversineKm(a: Pt, b: Pt): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Keep in sync with SERVICE_AREA in server/src/lib/geo.ts. */
export const inServiceArea = (p: Pt): boolean => p.lat >= 15.6 && p.lat <= 16.6 && p.lng >= 119.6 && p.lng <= 120.9;

const toPt = (p: LatLngT): Pt => ({ lat: p[0], lng: p[1] });

export function pathLengthKm(path: LatLngT[]): number {
  let km = 0;
  for (let i = 1; i < path.length; i++) km += haversineKm(toPt(path[i - 1]), toPt(path[i]));
  return km;
}

/** Point `km` kilometres along a path. Clamped to the ends. */
export function pointAlong(path: LatLngT[], km: number): LatLngT {
  if (path.length === 0) return [0, 0];
  let left = Math.max(0, km);
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(toPt(path[i - 1]), toPt(path[i]));
    if (left <= seg || i === path.length - 1) {
      const f = seg === 0 ? 1 : Math.min(1, left / seg);
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
    }
    left -= seg;
  }
  return path[path.length - 1];
}

/** Distance still to travel along a path from the vertex nearest to `pos`. */
export function remainingKm(path: LatLngT[], pos: Pt): number {
  if (path.length < 2) return 0;
  let best = 0;
  let bestD = Infinity;
  path.forEach((p, i) => {
    const d = haversineKm(pos, toPt(p));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return bestD + pathLengthKm(path.slice(best));
}

export const etaMinutes = (km: number): number => Math.max(1, Math.round((km / 26) * 60));
