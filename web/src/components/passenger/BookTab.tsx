'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { etaMinutes, inServiceArea, remainingKm } from '@/lib/geo';
import { useGeolocation } from '@/lib/hooks';
import { useNearbyRiders } from '@/lib/useNearbyRiders';
import { useQuote } from '@/lib/useQuote';
import { DEFAULT_CENTER } from '@/lib/places';
import type { Place, Ride } from '@/lib/types';
import { ChatModal } from '../ChatModal';
import { PlacePicker } from '../PlacePicker';
import { RatingForm } from '../RatingForm';
import { RideMap } from '../RideMap';
import { Modal, Spinner } from '../ui';
import { BookingSheet, CancelledSheet, NoRidersSheet, SearchingSheet, TripSheet } from './sheets';

type Slot = 'pickup' | 'dropoff' | null;
const LIVE = ['accepted', 'arrived', 'ongoing'];

export function BookTab({ initialDest, onConsumedDest }: { initialDest: Place | null; onConsumedDest: () => void }) {
  const { ride, setRide, clearRide, livePos, fail, toast } = useApp();
  const geo = useGeolocation(!ride);
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [picking, setPicking] = useState<Slot>(null);
  const [mapPick, setMapPick] = useState<Slot>(null);
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { quote, loading: quoting, error: quoteError } = useQuote(pickup, dropoff, !ride);
  const nearby = useNearbyRiders(!ride ? pickup : null);

  // Destination chosen on the Home tab.
  useEffect(() => {
    if (initialDest) {
      setDropoff(initialDest);
      onConsumedDest();
    }
  }, [initialDest, onConsumedDest]);

  // Default pickup: the real location when inside Pangasinan, otherwise Dagupan.
  useEffect(() => {
    if (pickup || ride) return;
    if (geo.status === 'ok' && geo.pos) {
      setPickup(inServiceArea(geo.pos) ? { label: 'My current location', ...geo.pos } : { label: 'Dagupan City', ...DEFAULT_CENTER });
    } else if (geo.status === 'denied' || geo.status === 'unavailable') {
      setPickup({ label: 'Dagupan City', ...DEFAULT_CENTER });
    }
  }, [geo.status, geo.pos, pickup, ride]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const book = () =>
    run(async () => {
      const r = await api<{ ride: Ride }>('/api/rides', { body: { pickup, dropoff, paymentMethod: 'cash' } });
      setRide(r.ride);
    });

  const cancelRide = () =>
    run(async () => {
      await api(`/api/rides/${ride!.id}/cancel`, { method: 'POST', body: {} });
      setConfirmCancel(false);
    });

  const retry = () => {
    if (!ride) return;
    setPickup(ride.pickup);
    setDropoff(ride.dropoff);
    clearRide();
  };

  const onMapTap = useCallback(
    (p: { lat: number; lng: number }) => {
      if (!mapPick) return;
      if (!inServiceArea(p)) return toast('RideGo Pangasinan serves Pangasinan only', 'error');
      const place = { label: 'Pinned location', lat: p.lat, lng: p.lng };
      if (mapPick === 'pickup') setPickup(place);
      else setDropoff(place);
      setMapPick(null);
    },
    [mapPick, toast],
  );

  const useMyLocation = () => {
    if (geo.pos && inServiceArea(geo.pos)) {
      setPickup({ label: 'My current location', ...geo.pos });
      setPicking(null);
    } else toast('We could not find your location inside Pangasinan', 'error');
  };

  const status = ride?.status;
  const mapProps = useMemo(() => {
    if (!ride) {
      return {
        pickup,
        dropoff,
        route: quote?.geometry ?? null,
        riders: nearby,
        me: geo.pos,
        fitKey: `draft:${pickup?.lat},${pickup?.lng}:${dropoff?.lat},${dropoff?.lng}`,
        padBottom: dropoff ? 300 : 220,
      };
    }
    const base = { pickup: ride.pickup, dropoff: ride.dropoff, route: ride.geometry, padBottom: 320, fitKey: `${ride.id}:${status}` };
    if (status === 'accepted' || status === 'arrived') return { ...base, approach: ride.approach?.geometry ?? null, rider: livePos };
    if (status === 'ongoing') return { ...base, rider: livePos };
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, status, pickup, dropoff, quote, nearby, geo.pos, livePos]);

  let etaMin: number | null = null;
  if (ride && livePos) {
    if (status === 'accepted' && ride.approach) etaMin = etaMinutes(remainingKm(ride.approach.geometry, livePos));
    if (status === 'ongoing') etaMin = etaMinutes(remainingKm(ride.geometry, livePos));
  } else if (ride && status === 'accepted' && ride.approach) etaMin = Math.max(1, Math.round(ride.approach.durationMin));

  return (
    <div className="relative h-full">
      <RideMap {...mapProps} onTap={mapPick ? onMapTap : undefined} />

      {mapPick && (
        <div className="absolute inset-x-4 top-4 z-[600] flex items-center justify-between gap-3 rounded-2xl bg-[rgb(var(--chip))] px-4 py-3 text-[rgb(var(--chip-fg))] shadow-lg">
          <span className="text-sm font-semibold">Tap the map to set your {mapPick === 'pickup' ? 'pickup' : 'destination'}</span>
          <button className="rounded-full bg-white/15 p-1.5" onClick={() => setMapPick(null)} aria-label="Cancel picking">
            <X size={16} />
          </button>
        </div>
      )}

      {!ride && !mapPick && (
        <BookingSheet
          pickup={pickup}
          dropoff={dropoff}
          quote={quote}
          quoting={quoting}
          quoteError={quoteError}
          nearbyCount={nearby.length}
          busy={busy}
          onPickPickup={() => setPicking('pickup')}
          onPickDropoff={() => setPicking('dropoff')}
          onQuick={setDropoff}
          onConfirm={book}
        />
      )}

      {ride?.status === 'searching' && <SearchingSheet ride={ride} busy={busy} onCancel={cancelRide} />}
      {ride?.status === 'no_riders' && <NoRidersSheet onRetry={retry} onBack={clearRide} />}
      {ride?.status === 'cancelled' && <CancelledSheet ride={ride} onClose={clearRide} />}
      {ride && LIVE.includes(ride.status) && <TripSheet ride={ride} etaMin={etaMin} onChat={() => setChatOpen(true)} onCancel={() => setConfirmCancel(true)} />}

      {ride?.status === 'completed' && (
        <Modal title="Trip summary">
          <RatingForm ride={ride} onDone={clearRide} />
        </Modal>
      )}

      {picking && (
        <PlacePicker
          title={picking === 'pickup' ? 'Set pickup' : 'Set destination'}
          onClose={() => setPicking(null)}
          onPick={(p) => {
            if (picking === 'pickup') setPickup(p);
            else setDropoff(p);
            setPicking(null);
          }}
          onUseLocation={picking === 'pickup' ? useMyLocation : undefined}
          onPickOnMap={() => {
            setMapPick(picking);
            setPicking(null);
          }}
        />
      )}

      {chatOpen && ride && <ChatModal ride={ride} title={`Chat with ${ride.rider?.name.split(' ')[0] ?? 'rider'}`} onClose={() => setChatOpen(false)} />}

      {confirmCancel && (
        <Modal title="Cancel this ride?" onClose={() => setConfirmCancel(false)}>
          <p className="text-sm text-muted">Your rider is already on the way. Cancelling too often may affect your account.</p>
          <button className="btn btn-danger mt-4" onClick={cancelRide} disabled={busy}>
            {busy ? <Spinner /> : 'Yes, cancel ride'}
          </button>
          <button className="btn btn-ghost mt-3" onClick={() => setConfirmCancel(false)}>
            Keep my ride
          </button>
        </Modal>
      )}
    </div>
  );
}
