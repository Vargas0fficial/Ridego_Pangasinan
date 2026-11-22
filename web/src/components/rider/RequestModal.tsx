'use client';

import { useEffect, useState } from 'react';
import { MapPin, Navigation, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { fmtClock, fmtKm, peso } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import type { Offer, Ride } from '@/lib/types';
import { Modal, Spinner } from '../ui';

const OFFER_MS = 15000;

/** Seconds left. Uses the shorter of the server deadline and 15s from arrival, so clock drift cannot stretch the offer. */
export const secondsLeft = (o: Offer, now: number): number => Math.max(0, Math.min(o.expiresAt - now, OFFER_MS - (now - o.receivedAt)) / 1000);

export function RequestModal({ offer, onAccepted }: { offer: Offer; onAccepted: () => void }) {
  const { setRide, removeOffer, fail, toast } = useApp();
  const now = useNow(250);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const left = secondsLeft(offer, now);

  useEffect(() => {
    if (left <= 0 && !busy) removeOffer(offer.rideId);
  }, [left, busy, offer.rideId, removeOffer]);

  const accept = async () => {
    setBusy('accept');
    try {
      const r = await api<{ ride: Ride }>(`/api/rides/${offer.rideId}/accept`, { method: 'POST', body: {} });
      setRide(r.ride);
      removeOffer(offer.rideId);
      onAccepted();
    } catch (e) {
      removeOffer(offer.rideId);
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy('decline');
    try {
      await api(`/api/rides/${offer.rideId}/decline`, { method: 'POST', body: {} });
    } catch {
      toast('Could not decline, but the request will expire on its own');
    } finally {
      removeOffer(offer.rideId);
      setBusy(null);
    }
  };

  return (
    <Modal title="New Ride Request">
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-primary-soft px-4 py-3 text-primary-strong">
        <span className="text-sm font-bold">Respond in</span>
        <span className="font-display text-2xl font-extrabold tabular-nums">{fmtClock(left).slice(3)}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear" style={{ width: `${(left / (OFFER_MS / 1000)) * 100}%` }} />
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold">
        {offer.passenger.name}
        <span className="inline-flex items-center gap-1 text-[13px]">
          <Star size={13} className="fill-amber text-amber" /> {offer.passenger.rating ? offer.passenger.rating.toFixed(1) : 'New'}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex gap-3">
          <MapPin size={20} className="mt-0.5 flex-none text-primary" />
          <div>
            <div className="sec-title">Pickup · {fmtKm(offer.toPickupKm)} away</div>
            <div className="font-semibold">{offer.pickup.label}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Navigation size={20} className="mt-0.5 flex-none" />
          <div>
            <div className="sec-title">Destination</div>
            <div className="font-semibold">{offer.dropoff.label}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="card !p-2.5">
          <div className="sec-title">Distance</div>
          <div className="font-display font-bold">{offer.distanceKm.toFixed(1)} km</div>
        </div>
        <div className="card !p-2.5">
          <div className="sec-title">Fare</div>
          <div className="font-display font-bold">{peso(offer.fare)}</div>
        </div>
        <div className="card !bg-primary-soft !p-2.5">
          <div className="sec-title !text-primary-strong">You earn</div>
          <div className="font-display font-extrabold text-primary-strong">{peso(offer.riderEarning)}</div>
        </div>
      </div>

      <button className="btn mt-4" onClick={accept} disabled={!!busy || left <= 0}>
        {busy === 'accept' ? <Spinner /> : 'Accept Ride'}
      </button>
      <button className="btn btn-ghost mt-3" onClick={decline} disabled={!!busy}>
        {busy === 'decline' ? <Spinner /> : 'Decline'}
      </button>
    </Modal>
  );
}
