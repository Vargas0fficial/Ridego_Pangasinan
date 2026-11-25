'use client';

import { useState } from 'react';
import { Flag, MapPinCheck, MessageCircle, Phone, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { etaMinutes, remainingKm } from '@/lib/geo';
import { fmtKm, peso } from '@/lib/format';
import { ChatModal } from '../ChatModal';
import { RatingForm } from '../RatingForm';
import { RideMap } from '../RideMap';
import { ScooterIcon } from '../ScooterIcon';
import { RouteLines } from '../RideCards';
import { Avatar, EmptyState, Modal, Rating, Sheet, Spinner } from '../ui';

export function ActiveTab() {
  const { ride, livePos, clearRide, fail, unreadChat } = useApp();
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [chat, setChat] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const status = ride?.status;
  const call = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (s: 'arrived' | 'started' | 'completed') =>
    call(async () => {
      await api(`/api/rides/${ride!.id}/status`, { body: { status: s, pin: s === 'started' ? pin : undefined } });
      if (s === 'started') setPin('');
    });

  if (!ride || !['accepted', 'arrived', 'ongoing', 'completed'].includes(ride.status)) {
    return <EmptyState icon={<ScooterIcon size={26} />} title="No active ride" text="Accept a request and it will show up here with the route and trip steps." />;
  }

  let etaMin: number | null = null;
  if (livePos && status === 'accepted' && ride.approach) etaMin = etaMinutes(remainingKm(ride.approach.geometry, livePos));
  if (livePos && status === 'ongoing') etaMin = etaMinutes(remainingKm(ride.geometry, livePos));

  const title = { accepted: 'Head to the pickup', arrived: 'Waiting for passenger', ongoing: 'Trip in progress', completed: 'Trip complete' }[ride.status as 'accepted'];

  return (
    <div className="relative h-full">
      <RideMap
        pickup={ride.pickup}
        dropoff={ride.dropoff}
        route={ride.geometry}
        approach={status === 'accepted' ? ride.approach?.geometry : null}
        rider={livePos}
        fitKey={`ra:${ride.id}:${status}`}
        padBottom={330}
      />

      {ride.status !== 'completed' && (
        <Sheet>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">{title}</h2>
            {etaMin !== null && <span className="tag">{etaMin} min</span>}
          </div>

          {ride.passenger && (
            <div className="card flex items-center gap-3">
              <Avatar name={ride.passenger.name} photo={ride.passenger.photo} size={52} zoomable />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display font-bold">{ride.passenger.name}</div>
                <Rating value={ride.passenger.rating} />
              </div>
              <div className="text-right">
                <div className="sec-title">You earn</div>
                <div className="font-display text-lg font-extrabold text-primary-strong">{peso(ride.riderEarning)}</div>
              </div>
            </div>
          )}

          <div className="card mt-2.5">
            <RouteLines ride={ride} />
            <div className="mt-3 border-t border-line pt-3 text-sm text-muted">
              {fmtKm(ride.distanceKm)} · Fare {peso(ride.fare)} ({ride.paymentMethod === 'cash' ? 'collect cash' : 'paid online'})
            </div>
          </div>

          {ride.status === 'arrived' && (
            <div className="mt-2.5">
              <label className="sec-title mb-1.5 block" htmlFor="pin">
                Ask the passenger for their 4-digit trip PIN
              </label>
              <input
                id="pin"
                className="input text-center font-display text-3xl font-extrabold tracking-[.4em]"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoComplete="one-time-code"
              />
            </div>
          )}

          <div className="mt-3 space-y-2.5">
            {ride.status === 'accepted' && (
              <button className="btn" onClick={() => setStatus('arrived')} disabled={busy}>
                {busy ? <Spinner /> : <MapPinCheck size={20} />} I've arrived at pickup
              </button>
            )}
            {ride.status === 'arrived' && (
              <button className="btn" onClick={() => setStatus('started')} disabled={busy || pin.length !== 4}>
                {busy ? <Spinner /> : <Play size={20} />} Start trip
              </button>
            )}
            {ride.status === 'ongoing' && (
              <button className="btn" onClick={() => setStatus('completed')} disabled={busy}>
                {busy ? <Spinner /> : <Flag size={20} />} Complete trip
              </button>
            )}

            <div className="flex gap-2.5">
              <button className="btn btn-soft btn-sm" onClick={() => setChat(true)}>
                <MessageCircle size={18} /> Message
                {unreadChat > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1.5 text-[11px] font-extrabold text-black">{unreadChat}</span>}
              </button>
              {ride.passenger?.phone && (
                <a className="btn btn-soft btn-sm" href={`tel:${ride.passenger.phone}`}>
                  <Phone size={18} /> Call
                </a>
              )}
            </div>

            {(ride.status === 'accepted' || ride.status === 'arrived') && (
              <button className="btn btn-cancel btn-sm" onClick={() => setConfirmCancel(true)}>
                Cancel ride
              </button>
            )}
          </div>
        </Sheet>
      )}

      {ride.status === 'completed' && (
        <Modal title="Trip summary">
          <RatingForm ride={ride} onDone={clearRide} />
        </Modal>
      )}

      {chat && <ChatModal ride={ride} title={`Chat with ${ride.passenger?.name.split(' ')[0] ?? 'passenger'}`} onClose={() => setChat(false)} />}

      {confirmCancel && (
        <Modal title="Cancel this ride?" onClose={() => setConfirmCancel(false)}>
          <p className="text-sm text-muted">The passenger will be matched with another rider. Cancelling often can affect your account.</p>
          <button
            className="btn btn-danger mt-4"
            disabled={busy}
            onClick={() =>
              call(async () => {
                await api(`/api/rides/${ride.id}/cancel`, { method: 'POST', body: {} });
                setConfirmCancel(false);
              })
            }
          >
            {busy ? <Spinner /> : 'Yes, cancel ride'}
          </button>
          <button className="btn btn-ghost mt-3" onClick={() => setConfirmCancel(false)}>
            Keep ride
          </button>
        </Modal>
      )}
    </div>
  );
}