const KEY = 'ridego_skipped_ratings';

const read = (): string[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** True if the user chose "Skip for now" on this finished ride, so it should not pop up again after a reload. */
export const isSkipped = (rideId: string): boolean => typeof window !== 'undefined' && read().includes(rideId);

export function skipRating(rideId: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...read().filter((x) => x !== rideId), rideId].slice(-30)));
  } catch {
    /* storage blocked: the popup may come back after a reload, nothing else breaks */
  }
}