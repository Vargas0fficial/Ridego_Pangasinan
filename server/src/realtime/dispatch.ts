import { config } from '../config';
import { User } from '../models/User';
import { Ride } from '../models/Ride';
import { haversineKm, type LatLngTuple } from '../lib/geo';
import { ratingOf } from '../models/User';
import { getIO } from './hub';
import { loadRide, pushRide } from './emit';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Offer = {
  rideId: string;
  expiresAt: number;
  passenger: { name: string; rating: number };
  pickup: { label: string; lat: number; lng: number };
  dropoff: { label: string; lat: number; lng: number };
  distanceKm: number;
  durationMin: number;
  fare: number;
  riderEarning: number;
  toPickupKm: number;
  geometry: LatLngTuple[];
};

type State = {
  rideId: string;
  wave: number;
  offers: Map<string, Offer>;
  excluded: Set<string>;
  timer?: NodeJS.Timeout;
};

/** In-memory dispatch state. A server restart drops open offers, and recoverState() closes stale searches. */
const states = new Map<string, State>();

export function startDispatch(rideId: string, exclude: string[] = []): void {
  stopDispatch(rideId, 'restart');
  const st: State = { rideId, wave: 0, offers: new Map(), excluded: new Set(exclude) };
  states.set(rideId, st);
  void runWave(st);
}

export function stopDispatch(rideId: string, reason: string, exceptRider?: string): void {
  const st = states.get(rideId);
  if (!st) return;
  if (st.timer) clearTimeout(st.timer);
  states.delete(rideId);
  for (const riderId of st.offers.keys()) {
    if (riderId !== exceptRider) getIO().to('user:' + riderId).emit('ride:request:closed', { rideId, reason });
  }
}

export const canAccept = (rideId: string, riderId: string): boolean => {
  const offer = states.get(rideId)?.offers.get(riderId);
  return !!offer && offer.expiresAt > Date.now();
};

export function declineOffer(rideId: string, riderId: string): void {
  const st = states.get(rideId);
  if (!st) return;
  st.offers.delete(riderId);
  st.excluded.add(riderId);
}

export function offersFor(riderId: string): Offer[] {
  const out: Offer[] = [];
  for (const st of states.values()) {
    const offer = st.offers.get(riderId);
    if (offer && offer.expiresAt > Date.now()) out.push(offer);
  }
  return out;
}

async function runWave(st: State): Promise<void> {
  try {
    const ride = await loadRide(st.rideId);
    if (!ride || ride.status !== 'searching') {
      stopDispatch(st.rideId, 'closed');
      return;
    }
    const radius = config.dispatch.wavesKm[st.wave];
    if (radius === undefined) {
      stopDispatch(st.rideId, 'no_riders');
      await Ride.updateOne(
        { _id: st.rideId, status: 'searching' },
        { $set: { status: 'no_riders', cancelledBy: 'system', 'times.cancelled': new Date() } },
      );
      await pushRide(st.rideId);
      return;
    }

    const riders = await User.find({
      role: 'rider',
      isOnline: true,
      activeRideId: null,
      lat: { $ne: null },
      locationAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
    }).lean();

    const candidates = riders
      .map((r) => ({ r, km: haversineKm({ lat: r.lat as number, lng: r.lng as number }, ride.pickup) }))
      .filter((c) => c.km <= radius && !st.offers.has(String(c.r._id)) && !st.excluded.has(String(c.r._id)))
      .sort((a, b) => a.km - b.km)
      .slice(0, config.dispatch.maxOffersPerWave);

    const expiresAt = Date.now() + config.dispatch.offerSeconds * 1000;
    for (const c of candidates) {
      const offer: Offer = {
        rideId: st.rideId,
        expiresAt,
        passenger: { name: ride.passenger.name, rating: ratingOf(ride.passenger) },
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        distanceKm: ride.distanceKm,
        durationMin: ride.durationMin,
        fare: ride.fare,
        riderEarning: ride.riderEarning,
        toPickupKm: Math.round(c.km * 10) / 10,
        geometry: ride.geometry,
      };
      st.offers.set(String(c.r._id), offer);
      getIO().to('user:' + String(c.r._id)).emit('ride:request', offer);
    }

    const waitMs = candidates.length ? config.dispatch.offerSeconds * 1000 + 300 : 1500;
    st.timer = setTimeout(() => {
      for (const [riderId, offer] of st.offers) {
        if (offer.expiresAt <= Date.now()) {
          getIO().to('user:' + riderId).emit('ride:request:expired', { rideId: st.rideId });
        }
      }
      st.wave += 1;
      void runWave(st);
    }, waitMs);
  } catch (err) {
    console.error('[dispatch] wave failed', err);
  }
}
