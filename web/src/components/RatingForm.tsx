'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { skipRating } from '@/lib/dismissed';
import { peso } from '@/lib/format';
import type { Ride } from '@/lib/types';
import { Avatar, Spinner } from './ui';

const TAGS_PASSENGER = ['Safe driving', 'On time', 'Friendly', 'Clean helmet', 'Knows the way'];
const TAGS_RIDER = ['Polite', 'Ready on time', 'Clear pickup', 'Paid on time'];
const TIPS = [0, 10, 20, 50];

/** Ride-complete summary plus rating. Shown to both sides once a ride is completed. */
export function RatingForm({ ride, onDone }: { ride: Ride; onDone: () => void }) {
  const { user, fail, toast } = useApp();
  const isPassenger = user?.role === 'passenger';
  const other = isPassenger ? ride.rider : ride.passenger;
  const alreadyRated = isPassenger ? ride.rated.passenger : ride.rated.rider;
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!stars) return toast('Tap a star to rate', 'error');
    setBusy(true);
    try {
      await api(`/api/rides/${ride.id}/rate`, { body: { stars, tags, comment: comment.trim() || undefined, tip: isPassenger ? tip : undefined } });
      toast('Salamat sa rating!');
      onDone();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-on">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-extrabold">Ride completed</h2>
        <p className="text-sm text-muted">
          {ride.pickup.label} → {ride.dropoff.label}
        </p>
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <div className="sec-title">{isPassenger ? 'Total fare' : 'You earned'}</div>
          <div className="font-display text-3xl font-extrabold text-primary-strong">{peso(isPassenger ? ride.fare : ride.riderEarning)}</div>
        </div>
        <div className="text-right text-[13px] text-muted">
          <div>{ride.distanceKm.toFixed(1)} km</div>
          <div>{ride.paymentMethod === 'cash' ? (isPassenger ? 'Pay the rider in cash' : 'Collect cash') : 'Paid online'}</div>
          {!isPassenger && <div>Service fee {peso(ride.serviceFee)}</div>}
        </div>
      </div>

      {alreadyRated ? (
        <>
          <p className="text-center text-sm text-muted">You already rated this ride. Salamat!</p>
          <button className="btn" onClick={onDone}>
            Done
          </button>
        </>
      ) : (
        <>
          {other && (
            <div className="flex flex-col items-center gap-2">
              <Avatar name={other.name} photo={other.photo} size={56} />
              <div className="font-display font-bold">How was {isPassenger ? other.name : other.name.split(' ')[0]}?</div>
              <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} className="p-1">
                    <Star size={36} className={n <= stars ? 'fill-amber text-amber' : 'text-line'} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {(isPassenger ? TAGS_PASSENGER : TAGS_RIDER).map((t) => (
              <button key={t} className={`chip ${tags.includes(t) ? 'on' : ''}`} aria-pressed={tags.includes(t)} onClick={() => setTags((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))}>
                {t}
              </button>
            ))}
          </div>
          <textarea className="input min-h-[72px]" placeholder="Add a comment (optional)" maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} />
          {isPassenger && (
            <div>
              <div className="sec-title mb-2">Add a tip (optional)</div>
              <div className="flex gap-2">
                {TIPS.map((t) => (
                  <button key={t} className={`chip flex-1 justify-center ${tip === t ? 'on' : ''}`} aria-pressed={tip === t} onClick={() => setTip(t)}>
                    {t === 0 ? 'No tip' : peso(t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="btn" onClick={submit} disabled={busy}>
            {busy ? <Spinner /> : 'Submit rating'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              skipRating(ride.id);
              onDone();
            }}
          >
            Skip for now
          </button>
        </>
      )}
    </div>
  );
}