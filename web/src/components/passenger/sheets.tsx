'use client';

import { Banknote, CloudRain, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { fmtKm, peso } from '@/lib/format';
import type { Place, Quote, Ride } from '@/lib/types';
import { QUICK_DESTINATIONS, toPlace } from '@/lib/places';
import { RouteLines } from '../RideCards';
import { Avatar, Rating, Sheet, Spinner } from '../ui';

type Draft = {
  pickup: Place | null;
  dropoff: Place | null;
  quote: Quote | null;
  quoting: boolean;
  quoteError: string;
  nearbyCount: number;
  raincoat: boolean;
  onRaincoat: (on: boolean) => void;
  busy: boolean;
  onPickPickup: () => void;
  onPickDropoff: () => void;
  onQuick: (p: Place) => void;
  onConfirm: () => void;
};

export function BookingSheet(d: Draft) {
  const rainPrice = d.quote?.raincoatPrice ?? 49;
  const total = d.quote ? d.quote.fare + (d.raincoat ? rainPrice : 0) : 0;
  return (
    <Sheet>
      <h2 className="font-display text-xl font-extrabold tracking-tight">Where to?</h2>
      <div className="mt-3 space-y-2">
        <button className="card flex w-full items-center gap-3 !p-3 text-left" onClick={d.onPickPickup}>
          <span className="h-3 w-3 flex-none rounded-full bg-primary" />
          <span className="min-w-0 flex-1">
            <span className="sec-title block">Pickup</span>
            <span className="block truncate font-semibold">{d.pickup?.label ?? 'Finding your location…'}</span>
          </span>
        </button>
        <button className="card flex w-full items-center gap-3 !p-3 text-left" onClick={d.onPickDropoff}>
          <span className="h-3 w-3 flex-none rounded-sm bg-[rgb(var(--chip))]" />
          <span className="min-w-0 flex-1">
            <span className="sec-title block">Destination</span>
            <span className={`block truncate font-semibold ${d.dropoff ? '' : 'text-muted'}`}>{d.dropoff?.label ?? 'Choose a destination'}</span>
          </span>
        </button>
      </div>

      {!d.dropoff && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_DESTINATIONS.map((p) => (
            <button key={p.id} className="chip" onClick={() => d.onQuick(toPlace(p))}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {d.dropoff && (
        <div className="mt-3">
          {d.quoting && (
            <div className="card flex items-center gap-2 text-sm text-muted">
              <Spinner /> Computing your route and fare…
            </div>
          )}
          {d.quoteError && <div className="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{d.quoteError}</div>}
          {d.quote && !d.quoting && (
            <div className="card">
              <div className="flex items-end justify-between">
                <div>
                  <div className="sec-title">Estimated fare</div>
                  <div className="font-display text-[34px] font-extrabold leading-none text-primary-strong">{peso(total)}</div>
                  {d.raincoat && <div className="mt-1 text-xs font-semibold text-muted">includes {peso(rainPrice)} raincoat</div>}
                </div>
                <div className="text-right text-sm text-muted">
                  <div className="font-semibold text-fg">{d.quote.distanceKm.toFixed(1)} km</div>
                  <div>about {Math.max(1, Math.round(d.quote.durationMin))} min</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm font-semibold">
                <Banknote size={18} className="text-primary" /> Cash
                <span className="ml-auto text-xs font-medium text-muted">
                  {d.nearbyCount > 0 ? `${d.nearbyCount} rider${d.nearbyCount > 1 ? 's' : ''} nearby` : 'No riders nearby right now'}
                </span>
              </div>
            </div>
          )}
          {d.quote?.raining && !d.quoting && (
            <button
              type="button"
              role="switch"
              aria-checked={d.raincoat}
              onClick={() => d.onRaincoat(!d.raincoat)}
              className={`mt-3 flex w-full items-center gap-3 rounded-2xl border-[1.5px] p-3 text-left transition ${d.raincoat ? 'border-primary bg-primary-soft' : 'border-line bg-surface2'}`}
            >
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-surface text-primary-strong">
                <CloudRain size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">It's raining near your pickup</span>
                <span className="block text-[13px] text-muted">Add a raincoat (kapote) for {peso(rainPrice)}. Your rider brings one for you.</span>
              </span>
              <span className={`relative h-7 w-12 flex-none rounded-full transition ${d.raincoat ? 'bg-primary' : 'bg-line'}`} aria-hidden>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${d.raincoat ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
          )}
          <button className="btn mt-3" onClick={d.onConfirm} disabled={!d.quote || d.quoting || d.busy}>
            {d.busy ? <Spinner /> : d.quote ? `Confirm ride · ${peso(total)}` : 'Confirm ride'}
          </button>
        </div>
      )}
    </Sheet>
  );
}

export function SearchingSheet({ ride, busy, onCancel }: { ride: Ride; busy: boolean; onCancel: () => void }) {
  return (
    <Sheet>
      <div className="flex flex-col items-center py-2 text-center">
        <div className="rg-radar relative mb-3 grid h-28 w-28 place-items-center">
          <i />
          <i />
          <i />
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-on">
            <Spinner size={24} />
          </div>
        </div>
        <h2 className="font-display text-xl font-extrabold">Finding a rider…</h2>
        <p className="mt-1 text-sm text-muted">We are asking riders near {ride.pickup.label}. This usually takes under a minute.</p>
      </div>
      <div className="card mt-3">
        <RouteLines ride={ride} />
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
          <span className="text-muted">Fare (cash)</span>
          <span>{peso(ride.fare)}</span>
        </div>
        {ride.raincoat && (
          <div className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary-strong">
            <CloudRain size={15} /> Raincoat included
          </div>
        )}
      </div>
      <button className="btn btn-cancel mt-3" onClick={onCancel} disabled={busy}>
        {busy ? <Spinner /> : 'Cancel request'}
      </button>
    </Sheet>
  );
}

export function NoRidersSheet({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <Sheet>
      <h2 className="font-display text-xl font-extrabold">No riders available</h2>
      <p className="mt-1 text-sm text-muted">Walang rider na tumanggap sa ngayon. Try again in a few minutes or change your pickup point.</p>
      <button className="btn mt-4" onClick={onRetry}>
        Try again
      </button>
      <button className="btn btn-ghost mt-3" onClick={onBack}>
        Back
      </button>
    </Sheet>
  );
}

export function CancelledSheet({ ride, onClose }: { ride: Ride; onClose: () => void }) {
  return (
    <Sheet>
      <h2 className="font-display text-xl font-extrabold">Ride cancelled</h2>
      <p className="mt-1 text-sm text-muted">{ride.cancelledBy === 'passenger' ? 'You cancelled this ride.' : 'This ride was cancelled.'}</p>
      <button className="btn mt-4" onClick={onClose}>
        Okay
      </button>
    </Sheet>
  );
}

export function TripSheet({
  ride,
  etaMin,
  onChat,
  onCancel,
}: {
  ride: Ride;
  etaMin: number | null;
  onChat: () => void;
  onCancel: () => void;
}) {
  const { unreadChat } = useApp();
  const rider = ride.rider;
  if (!rider) return null;
  return (
    <Sheet>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          {ride.status === 'accepted' && 'Rider is on the way'}
          {ride.status === 'arrived' && 'Your rider has arrived'}
          {ride.status === 'ongoing' && 'Trip in progress'}
        </h2>
        {etaMin !== null && ride.status !== 'arrived' && <span className="tag">{etaMin} min</span>}
      </div>

      <div className="card flex items-center gap-3">
        <Avatar name={rider.name} photo={rider.photo} size={52} zoomable />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-bold">{rider.name}</div>
          <Rating value={rider.rating} count={rider.completedRides} />
          {rider.vehicle && (
            <div className="text-[13px] text-muted">
              {rider.vehicle.model} · {rider.vehicle.color}
            </div>
          )}
        </div>
        {rider.vehicle && <div className="rounded-lg border-2 border-fg px-2 py-1 font-display text-sm font-extrabold tracking-wider">{rider.vehicle.plate}</div>}
      </div>

      {ride.status !== 'ongoing' && ride.pin && (
        <div className="card mt-2.5 flex items-center justify-between !bg-primary-soft">
          <div>
            <div className="sec-title !text-primary-strong">Trip PIN</div>
            <div className="text-[13px] text-primary-strong">Tell your rider this PIN to start the trip</div>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-[.25em] text-primary-strong">{ride.pin}</div>
        </div>
      )}

      <div className="card mt-2.5">
        <RouteLines ride={ride} />
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">
            {fmtKm(ride.distanceKm)} · Cash
            {ride.raincoat && (
              <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-primary-strong">
                <CloudRain size={14} /> Raincoat included
              </span>
            )}
          </span>
          <span className="font-display text-lg font-extrabold">{peso(ride.fare)}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2.5">
        <button className="btn btn-soft btn-sm" onClick={onChat}>
          <MessageCircle size={18} /> Message
          {unreadChat > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1.5 text-[11px] font-extrabold text-black">{unreadChat}</span>}
        </button>
        {rider.phone && (
          <a className="btn btn-soft btn-sm" href={`tel:${rider.phone}`}>
            <Phone size={18} /> Call
          </a>
        )}
      </div>
      {ride.status !== 'ongoing' ? (
        <button className="btn btn-cancel btn-sm mt-2.5" onClick={onCancel}>
          Cancel ride
        </button>
      ) : (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} /> Use the shield at the top to share your trip or get help.
        </p>
      )}
    </Sheet>
  );
}