import { Router } from 'express';
import { HttpError, h } from '../lib/errors';
import { serializeTrack } from '../lib/serialize';
import { Ride } from '../models/Ride';

export const trackRouter = Router();

/** Public, unauthenticated view of a shared trip. Only available while the trip is live or just ended. */
trackRouter.get(
  '/:token',
  h(async (req, res) => {
    const token = String(req.params.token);
    if (!/^[a-f0-9]{16,64}$/.test(token)) throw new HttpError(404, 'Trip not found');
    const ride = await Ride.findOne({ shareToken: token })
      .populate('rider', 'name vehicle lat lng')
      .lean();
    if (!ride) throw new HttpError(404, 'Trip not found');
    const live = ['searching', 'accepted', 'arrived', 'ongoing'].includes(ride.status);
    const endedAt = ride.times?.completed ?? ride.times?.cancelled;
    const recent = endedAt ? Date.now() - new Date(endedAt).getTime() < 30 * 60 * 1000 : false;
    if (!live && !recent) throw new HttpError(404, 'This trip link has expired');
    res.json({ trip: serializeTrack(ride) });
  }),
);
