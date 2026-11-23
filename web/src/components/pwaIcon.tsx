import { MARK_D } from '@/lib/logoPaths';

/** The RideGo Pangasinan mark on a green tile, as JSX for next/og. `inset` shrinks the mark for maskable and iOS icons. */
export function PwaIconArt({ size, rounded, inset }: { size: number; rounded: boolean; inset: number }) {
  const s = (56 / 446) * inset;
  const w = 446 * s;
  const h = 304 * s;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx={rounded ? 16 : 0} fill="#0B9A55" />
      <path transform={`translate(${(64 - w) / 2} ${(64 - h) / 2}) scale(${s}) translate(-53 -11.2)`} d={MARK_D} fill="#ffffff" fillRule="evenodd" />
    </svg>
  );
}