import { config } from '../config';

export type LatLng = { lat: number; lng: number };
export type LatLngTuple = [number, number];

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Rough bounding box around Pangasinan. Trips outside it are rejected. */
export const SERVICE_AREA = { minLat: 15.6, maxLat: 16.6, minLng: 119.6, maxLng: 120.9 };

export const inServiceArea = (p: LatLng): boolean =>
  p.lat >= SERVICE_AREA.minLat && p.lat <= SERVICE_AREA.maxLat && p.lng >= SERVICE_AREA.minLng && p.lng <= SERVICE_AREA.maxLng;

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/** Base fare plus a per-km rate, rounded to the nearest 5 pesos, never below the minimum. */
export const fareFor = (km: number): number =>
  Math.max(config.fare.min, roundTo5(config.fare.base + config.fare.perKm * km));

export const serviceFeeFor = (fare: number): number => Math.round(fare * config.fare.serviceFeeRate);

export const minutesFor = (km: number): number => Math.max(3, Math.round((km / 26) * 60 + 2));

export type RouteResult = {
  distanceKm: number;
  durationMin: number;
  geometry: LatLngTuple[];
  source: 'osrm' | 'estimate';
};

function simplify(points: LatLngTuple[], max = 400): LatLngTuple[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Road route from OSRM. Falls back to a straight-line estimate when OSRM is unreachable. */
export async function routeBetween(a: LatLng, b: LatLng): Promise<RouteResult> {
  try {
    const url = `${config.osrmUrl}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'RideGoPangasinan/0.1' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as {
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
    };
    const r = data.routes?.[0];
    if (!r) throw new Error('No route');
    const km = Math.max(0.1, r.distance / 1000);
    return {
      distanceKm: round1(km),
      durationMin: Math.max(2, Math.round(r.duration / 60)),
      geometry: simplify(r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple)),
      source: 'osrm',
    };
  } catch {
    const km = Math.max(0.1, haversineKm(a, b) * 1.3);
    return {
      distanceKm: round1(km),
      durationMin: minutesFor(km),
      geometry: [
        [a.lat, a.lng],
        [b.lat, b.lng],
      ],
      source: 'estimate',
    };
  }
}
