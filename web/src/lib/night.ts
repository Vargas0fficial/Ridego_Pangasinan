'use client';

import { useEffect, useState } from 'react';

/** In the Philippines the sun sets near 6 pm and rises near 5:30 am all year, so a clock check is enough. */
export const isNightAt = (d: Date): boolean => {
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= 18 * 60 || minutes < 5 * 60 + 30;
};

/** True while it is night on the user's device clock. Re-checked every minute. */
export function useNight(): boolean {
  const [night, setNight] = useState(false);
  useEffect(() => {
    const tick = () => setNight(isNightAt(new Date()));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  return night;
}