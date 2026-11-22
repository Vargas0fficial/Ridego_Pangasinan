import { Router } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import { config } from '../config';
import { requireAuth } from '../lib/auth';
import { HttpError, h } from '../lib/errors';
import { fareFor, haversineKm, inServiceArea, routeBetween, serviceFeeFor, type LatLng } from '../lib/geo';
import { serializeRide } from '../lib/serialize';
import { ACTIVE_STATUSES, Ride, WITH_RIDER_STATUSES } from '../models/Ride';
import { User, type UserDoc } from '../models/User';
import { canAccept, declineOffer, startDispatch, stopDispatch } from '../realtime/dispatch';
import { loadRide, loadRides, pushRide } from '../realtime/emit';
import { getIO, joinRideRoom, leaveRideRoom, riderRides } from '../realtime/hub';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const ridesRouter = Router();

const placeS = z.object({
  label: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const quoteS = z.object({ pickup: placeS, dropoff: placeS, paymentMethod: z.enum(['cash', 'online']).default('cash') });

const oid = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) throw new HttpError(400, 'Invalid ride id');
  return new Types.ObjectId(value);
};

async function buildQuote(pickup: LatLng, dropoff: LatLng) {
  if (!inServiceArea(pickup) || !inServiceArea(dropoff)) {
    throw new HttpError(400, 'RideGo Pangasinan serves trips inside Pangasinan only');
  }
  if (haversineKm(pickup, dropoff) < 0.15) throw new HttpError(400, 'Pickup and destination are too close together');
  const route = await routeBetween(pickup, dropoff);
  if (route.distanceKm > config.maxTripKm) throw new HttpError(400, `Trips are limited to ${config.maxTripKm} km`);
  const fare = fareFor(route.distanceKm);
  const serviceFee = serviceFeeFor(fare);
  return { ...route, fare, serviceFee, riderEarning: fare - serviceFee };
}

async function releaseRider(ride: { rider?: Types.ObjectId | null }): Promise<void> {
  if (!ride.rider) return;
  await User.updateOne({ _id: ride.rider }, { $set: { activeRideId: null } });
  riderRides.delete(String(ride.rider));
}

/* ---------- quote and create ---------- */

ridesRouter.post(
  '/quote',
  requireAuth('passenger'),
  h(async (req, res) => {
    const b = quoteS.parse(req.body);
    const q = await buildQuote(b.pickup, b.dropoff);
    res.json({ distanceKm: q.distanceKm, durationMin: q.durationMin, fare: q.fare, geometry: q.geometry, source: q.source });
  }),
);

ridesRouter.post(
  '/',
  requireAuth('passenger'),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const b = quoteS.parse(req.body);
    const existing = await Ride.findOne({ passenger: user._id, status: { $in: ACTIVE_STATUSES } }).select('_id');
    if (existing) throw new HttpError(409, 'You already have a ride in progress');
    const q = await buildQuote(b.pickup, b.dropoff);
    const ride = await Ride.create({
      passenger: user._id,
      pickup: b.pickup,
      dropoff: b.dropoff,
      distanceKm: q.distanceKm,
      durationMin: q.durationMin,
      fare: q.fare,
      serviceFee: q.serviceFee,
      riderEarning: q.riderEarning,
      paymentMethod: b.paymentMethod,
      status: 'searching',
      pin: String(crypto.randomInt(1000, 10000)),
      shareToken: crypto.randomBytes(12).toString('hex'),
      geometry: q.geometry,
    });
    joinRideRoom(String(user._id), String(ride._id));
    startDispatch(String(ride._id));
    res.status(201).json({ ride: serializeRide(await loadRide(ride._id), 'passenger') });
  }),
);

/* ---------- reads ---------- */

/** Online riders near a point, with coordinates rounded and no identities, for the passenger map. */
ridesRouter.get(
  '/nearby-riders',
  requireAuth(),
  h(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'lat and lng are required');
    const riders = await User.find({
      role: 'rider',
      isOnline: true,
      activeRideId: null,
      lat: { $ne: null },
      locationAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
    })
      .select('lat lng')
      .lean();
    const near = riders
      .filter((r) => haversineKm({ lat, lng }, { lat: r.lat as number, lng: r.lng as number }) <= 10)
      .slice(0, 20)
      .map((r) => ({ lat: Math.round((r.lat as number) * 1e4) / 1e4, lng: Math.round((r.lng as number) * 1e4) / 1e4 }));
    res.json({ riders: near });
  }),
);

/** The caller's current ride, or the ride they finished in the last 2 hours and have not rated yet. */
ridesRouter.get(
  '/active',
  requireAuth(),
  h(async (_req, res) => {
    const user = res.locals.user as UserDoc;
    const isRider = user.role === 'rider';
    const view = isRider ? 'rider' : 'passenger';
    let found: any = await Ride.findOne({
      [view]: user._id,
      status: { $in: isRider ? WITH_RIDER_STATUSES : ACTIVE_STATUSES },
    } as any)
      .sort({ createdAt: -1 })
      .select('_id');
    if (!found) {
      found = await Ride.findOne({
        [view]: user._id,
        status: 'completed',
        [isRider ? 'ratings.byRider.stars' : 'ratings.byPassenger.stars']: { $exists: false },
        'times.completed': { $gt: new Date(Date.now() - 2 * 3600 * 1000) },
      } as any)
        .sort({ 'times.completed': -1 })
        .select('_id');
    }
    if (!found) {
      res.json({ ride: null });
      return;
    }
    res.json({ ride: serializeRide(await loadRide(found._id), view) });
  }),
);

ridesRouter.get(
  '/history',
  requireAuth(),
  h(async (_req, res) => {
    const user = res.locals.user as UserDoc;
    const view = user.role === 'rider' ? 'rider' : 'passenger';
    const rides = await loadRides({ [view]: user._id, status: { $in: ['completed', 'cancelled', 'no_riders'] } });
    res.json({ rides: rides.map((r) => ({ ...serializeRide(r, view), messages: [] })) });
  }),
);

/* ---------- actions ---------- */

ridesRouter.post(
  '/:id/cancel',
  requireAuth(),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const id = oid(String(req.params.id));
    const rideId = String(id);

    if (user.role === 'passenger') {
      const ride = await Ride.findOneAndUpdate(
        { _id: id, passenger: user._id, status: { $in: ['searching', 'accepted', 'arrived'] } },
        { $set: { status: 'cancelled', cancelledBy: 'passenger', 'times.cancelled': new Date() } },
        { new: true },
      );
      if (!ride) throw new HttpError(409, "This ride can't be cancelled anymore");
      stopDispatch(rideId, 'cancelled');
      await releaseRider(ride);
      await pushRide(id);
      res.json({ ok: true });
      return;
    }

    // A rider backing out sends the ride back to the search so the passenger is not left stranded.
    const before = await Ride.findOneAndUpdate(
      { _id: id, rider: user._id, status: { $in: ['accepted', 'arrived'] } },
      {
        $set: { status: 'searching' },
        $unset: { rider: 1, approach: 1, 'times.accepted': 1, 'times.arrived': 1 },
      },
    );
    if (!before) throw new HttpError(409, "This ride can't be cancelled anymore");
    await User.updateOne({ _id: user._id }, { $set: { activeRideId: null } });
    riderRides.delete(String(user._id));
    leaveRideRoom(String(user._id), rideId);
    getIO().to('user:' + String(user._id)).emit('ride:released', { rideId });
    await pushRide(id);
    startDispatch(rideId, [String(user._id)]);
    res.json({ ok: true });
  }),
);

ridesRouter.post(
  '/:id/accept',
  requireAuth('rider'),
  h(async (req, res) => {
    const rider = res.locals.user as UserDoc;
    const id = oid(String(req.params.id));
    const rideId = String(id);
    const riderId = String(rider._id);

    if (!canAccept(rideId, riderId)) throw new HttpError(409, 'This request expired or was taken by another rider');
    if (rider.activeRideId) throw new HttpError(409, 'Finish your current ride first');

    const claimed = await User.updateOne({ _id: rider._id, activeRideId: null }, { $set: { activeRideId: id } });
    if (claimed.modifiedCount === 0) throw new HttpError(409, 'Finish your current ride first');

    const ride = await Ride.findOneAndUpdate(
      { _id: id, status: 'searching' },
      { $set: { rider: rider._id, status: 'accepted', 'times.accepted': new Date() } },
      { new: true },
    );
    if (!ride) {
      await User.updateOne({ _id: rider._id }, { $set: { activeRideId: null } });
      throw new HttpError(409, 'This request was taken by another rider');
    }

    stopDispatch(rideId, 'accepted', riderId);
    riderRides.set(riderId, { rideId, token: ride.shareToken });
    joinRideRoom(riderId, rideId);

    const start: LatLng = rider.lat != null && rider.lng != null ? { lat: rider.lat, lng: rider.lng } : ride.pickup;
    const approach = await routeBetween(start, ride.pickup);
    await Ride.updateOne(
      { _id: id },
      { $set: { approach: { geometry: approach.geometry, distanceKm: approach.distanceKm, durationMin: approach.durationMin } } },
    );
    const full = await pushRide(id);
    res.json({ ride: serializeRide(full, 'rider') });
  }),
);

ridesRouter.post(
  '/:id/decline',
  requireAuth('rider'),
  h(async (req, res) => {
    const rider = res.locals.user as UserDoc;
    declineOffer(String(oid(String(req.params.id))), String(rider._id));
    res.json({ ok: true });
  }),
);

const statusS = z.object({ status: z.enum(['arrived', 'started', 'completed']), pin: z.string().optional() });
const TRANSITIONS = {
  arrived: { from: 'accepted', to: 'arrived', time: 'times.arrived' },
  started: { from: 'arrived', to: 'ongoing', time: 'times.started' },
  completed: { from: 'ongoing', to: 'completed', time: 'times.completed' },
} as const;

ridesRouter.post(
  '/:id/status',
  requireAuth('rider'),
  h(async (req, res) => {
    const rider = res.locals.user as UserDoc;
    const id = oid(String(req.params.id));
    const b = statusS.parse(req.body);
    const t = TRANSITIONS[b.status];

    if (b.status === 'started') {
      const check = await Ride.findOne({ _id: id, rider: rider._id }).select('pin');
      if (!check || check.pin !== (b.pin ?? '').trim()) throw new HttpError(400, 'That trip PIN is not correct');
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: id, rider: rider._id, status: t.from },
      { $set: { status: t.to, [t.time]: new Date() } },
      { new: true },
    );
    if (!ride) throw new HttpError(409, `This ride is not ready to be marked as ${b.status}`);

    if (b.status === 'completed') {
      await User.updateOne({ _id: rider._id }, { $set: { activeRideId: null }, $inc: { completedRides: 1 } });
      riderRides.delete(String(rider._id));
    }
    const full = await pushRide(id);
    res.json({ ride: serializeRide(full, 'rider') });
  }),
);

const rateS = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().max(30)).max(6).optional(),
  comment: z.string().trim().max(300).optional(),
  tip: z.number().min(0).max(200).optional(),
});

ridesRouter.post(
  '/:id/rate',
  requireAuth(),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const id = oid(String(req.params.id));
    const b = rateS.parse(req.body);
    const isRider = user.role === 'rider';

    const ride = await Ride.findOneAndUpdate(
      {
        _id: id,
        [isRider ? 'rider' : 'passenger']: user._id,
        status: 'completed',
        [isRider ? 'ratings.byRider.stars' : 'ratings.byPassenger.stars']: { $exists: false },
      } as any,
      {
        $set: isRider
          ? { 'ratings.byRider': { stars: b.stars, comment: b.comment } }
          : { 'ratings.byPassenger': { stars: b.stars, tags: b.tags ?? [], comment: b.comment, tip: b.tip ?? 0 } },
      },
    );
    if (!ride) throw new HttpError(409, 'This ride was already rated or is not finished yet');

    const target = isRider ? ride.passenger : ride.rider;
    if (target) await User.updateOne({ _id: target }, { $inc: { ratingSum: b.stars, ratingCount: 1 } });
    res.json({ ok: true });
  }),
);
