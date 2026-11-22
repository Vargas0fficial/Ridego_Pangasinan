import { MARK_D } from '@/lib/logoPaths';

/** RideGo Pangasinan app icon: the scooter, pin and road mark in white on a green tile. */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  // The mark is 446 x 304 units; scale it to 56 of the 64-unit tile and centre it.
  const s = 56 / 446;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="RideGo Pangasinan logo">
      <rect width="64" height="64" rx="16" fill="rgb(var(--primary))" />
      <path transform={`translate(4 ${(64 - 304 * s) / 2}) scale(${s}) translate(-53 -11.2)`} d={MARK_D} fill="#fff" fillRule="evenodd" />
    </svg>
  );
}

export function BrandName({ className = '' }: { className?: string }) {
  return <span className={`font-display font-extrabold tracking-tight ${className}`}>RideGo Pangasinan</span>;
}

export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <BrandName className="text-[17px] leading-none" />
    </span>
  );
}
