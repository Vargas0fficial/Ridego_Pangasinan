import { Router } from 'express';
import { z } from 'zod';
import { publicUser, requireAuth } from '../lib/auth';
import { HttpError, h } from '../lib/errors';
import { Ride } from '../models/Ride';
import { User, type UserDoc } from '../models/User';
import { offersFor } from '../realtime/dispatch';

export const riderRouter = Router();

const onlineS = z.object({
  online: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

riderRouter.post(
  '/online',
  requireAuth('rider'),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const b = onlineS.parse(req.body);
    if (!b.online && user.activeRideId) throw new HttpError(409, 'Finish your active ride before going offline');
    const hasFix = b.lat !== undefined && b.lng !== undefined;
    if (b.online && !hasFix && user.lat == null) {
      throw new HttpError(400, 'Turn on location so we can match you with nearby passengers');
    }
    const set: Record<string, unknown> = { isOnline: b.online };
    if (hasFix) {
      set.lat = b.lat;
      set.lng = b.lng;
    }
    if (b.online) set.locationAt = new Date();
    await User.updateOne({ _id: user._id }, { $set: set });
    const fresh = await User.findById(user._id);
    res.json({ user: publicUser(fresh as UserDoc) });
  }),
);

/** Offers this rider can still accept. Used to restore the request pop-up after a page refresh. */
riderRouter.get(
  '/offers',
  requireAuth('rider'),
  h(async (_req, res) => {
    const user = res.locals.user as UserDoc;
    res.json({ offers: offersFor(String(user._id)) });
  }),
);

const TZ = 'Asia/Manila';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });

riderRouter.get(
  '/earnings',
  requireAuth('rider'),
  h(async (_req, res) => {
    const user = res.locals.user as UserDoc;
    const since = new Date(Date.now() - 8 * 24 * 3600 * 1000);
    const rides = await Ride.find({ rider: user._id, status: 'completed', 'times.completed': { $gte: since } })
      .sort({ 'times.completed': -1 })
      .lean();

    const week: { date: string; label: string; earnings: number; trips: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      week.push({ date: dayKey(d), label: dayLabel(d), earnings: 0, trips: 0 });
    }
    for (const r of rides) {
      const day = week.find((w) => w.date === dayKey(new Date(r.times.completed as Date)));
      if (day) {
        day.earnings += r.riderEarning;
        day.trips += 1;
      }
    }
    const today = week[week.length - 1];
    const recent = rides
      .filter((r) => dayKey(new Date(r.times.completed as Date)) === today.date)
      .map((r) => ({
        id: String(r._id),
        at: r.times.completed,
        pickup: r.pickup.label,
        dropoff: r.dropoff.label,
        distanceKm: r.distanceKm,
        fare: r.fare,
        earning: r.riderEarning,
      }));
    res.json({ today: { earnings: today.earnings, trips: today.trips }, week, recent });
  }),
);
