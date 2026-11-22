export const peso = (n: number): string => '₱' + Math.round(n).toLocaleString('en-PH');

export const fmtKm = (km: number): string => (km < 1 ? `${Math.max(50, Math.round(km * 20) * 50)} m` : `${km.toFixed(1)} km`);

export const fmtClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const fmtTime = (iso?: string | null): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
};

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
