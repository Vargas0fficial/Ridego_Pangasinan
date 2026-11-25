import { config } from '../config';
import type { LatLng } from './geo';

/** WMO weather codes for drizzle, rain, rain showers and thunderstorms. */
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export type CurrentWeather = { precipitation?: number; rain?: number; showers?: number; weather_code?: number };

/** True when the current conditions mean rain is falling now. */
export const rainFrom = (c: CurrentWeather | undefined | null): boolean =>
  !!c && ((c.rain ?? 0) > 0 || (c.showers ?? 0) > 0 || (c.precipitation ?? 0) >= 0.1 || RAIN_CODES.has(c.weather_code ?? -1));

type Entry = { raining: boolean; expires: number };
const cache = new Map<string, Entry>();
const OK_TTL_MS = 10 * 60 * 1000;
const FAIL_TTL_MS = 60 * 1000;

/**
 * Is it raining at this spot right now? Uses Open-Meteo (free, no API key) and remembers the answer for 10 minutes
 * per roughly 10 km square. If the lookup fails it says "not raining", so booking never depends on the weather service.
 */
export async function isRaining(p: LatLng): Promise<boolean> {
  if (config.weather.override === 'rain') return true;
  if (config.weather.override === 'clear') return false;

  const key = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.raining;

  let raining = false;
  let ttl = OK_TTL_MS;
  try {
    const url = `${config.weather.apiUrl}?latitude=${p.lat.toFixed(2)}&longitude=${p.lng.toFixed(2)}&current=precipitation,rain,showers,weather_code`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { current?: CurrentWeather };
    raining = rainFrom(data.current);
  } catch (err) {
    ttl = FAIL_TTL_MS;
    console.warn('[weather] lookup failed:', err instanceof Error ? err.message : err);
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, { raining, expires: Date.now() + ttl });
  return raining;
}