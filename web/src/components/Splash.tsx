'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LOCKUP_GREEN_D, LOCKUP_VIEWBOX, LOCKUP_WHITE_D } from '@/lib/logoPaths';

const MIN_MS = 1400;
const FADE_MS = 450;

/** Pangasinan skyline: hills, a church tower, birds and a winding road. Decorative only. */
function Skyline() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 w-full" viewBox="0 0 430 250" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <path d="M0 150c40-18 70-24 110-8 30-16 60-14 90 2 24-12 52-10 80 4 40-14 100-8 150 8v94H0z" fill="#000" opacity=".12" />
      <path d="M0 172c50-10 90-6 140 4 60-12 110-8 150 2 50-8 100-4 140 6v66H0z" fill="#000" opacity=".16" />
      {/* church */}
      <g fill="#04452a" opacity=".85">
        <rect x="318" y="118" width="62" height="64" />
        <rect x="326" y="92" width="22" height="30" />
        <path d="M326 92a11 11 0 0 1 22 0z" transform="translate(0 -2)" />
        <rect x="336" y="68" width="2" height="12" />
        <rect x="331" y="72" width="12" height="2" />
        <rect x="354" y="104" width="26" height="18" />
        <path d="M354 104a13 13 0 0 1 26 0z" />
        <rect x="296" y="140" width="26" height="42" />
        <path d="M296 140a13 13 0 0 1 26 0z" />
        <rect x="380" y="150" width="30" height="32" />
        <rect x="318" y="182" width="92" height="8" />
        <g fill="#0a7a47">
          <rect x="332" y="128" width="5" height="12" rx="2.5" />
          <rect x="344" y="128" width="5" height="12" rx="2.5" />
          <rect x="356" y="128" width="5" height="12" rx="2.5" />
          <rect x="368" y="128" width="5" height="12" rx="2.5" />
          <rect x="332" y="156" width="6" height="26" rx="3" />
          <rect x="346" y="156" width="6" height="26" rx="3" />
          <rect x="360" y="156" width="6" height="26" rx="3" />
        </g>
      </g>
      {/* trees */}
      <g fill="#04452a" opacity=".7">
        <ellipse cx="60" cy="176" rx="46" ry="14" />
        <ellipse cx="150" cy="172" rx="34" ry="11" />
        <ellipse cx="420" cy="176" rx="30" ry="14" />
      </g>
      {/* birds */}
      <g fill="none" stroke="#04452a" strokeWidth="1.6" strokeLinecap="round" opacity=".7">
        <path d="M250 112q4-5 8 0q4-5 8 0" />
        <path d="M222 138q3-4 6 0q3-4 6 0" />
        <path d="M286 98q3-4 6 0q3-4 6 0" />
      </g>
      {/* road */}
      <path d="M0 214c120-6 230-22 330-26c40-2 80 0 100 8v54H0z" fill="#06552f" />
      <path d="M0 232c110-4 210-18 300-20c60-1 100 8 130 18v20H0z" fill="#0a7a47" opacity=".55" />
      <path d="M-10 238c120-8 230-22 320-24c50-1 90 4 130 16" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeDasharray="16 14" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full-screen loading screen shown while the app starts (restoring the session).
 * Stays for at least MIN_MS so the logo does not just flash, then fades out.
 */
export function Splash() {
  const { ready } = useApp();
  const [minDone, setMinDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, []);

  const leaving = ready && minDone;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-label="Loading RideGo Pangasinan"
      className="absolute inset-0 z-[3000] flex flex-col items-center overflow-hidden transition-opacity"
      style={{
        background: 'linear-gradient(180deg, #22B25E 0%, #12975A 45%, #097546 100%)',
        opacity: leaving ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
      }}
    >
      <Skyline />
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 pb-24">
        <svg viewBox={LOCKUP_VIEWBOX} className="rg-splash-logo w-[64%] max-w-[300px]" role="img" aria-label="RideGo Pangasinan">
          <path d={LOCKUP_WHITE_D} fill="#fff" fillRule="evenodd" />
          <path d={LOCKUP_GREEN_D} fill="#5DF28F" fillRule="evenodd" />
        </svg>
        <p className="mt-2 text-[15px] font-medium italic text-white/95">Your Ride. Your Way. Pangasinan.</p>
        <div className="mt-14 flex gap-2.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="rg-splash-dot h-2.5 w-2.5 rounded-full bg-white/30" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
