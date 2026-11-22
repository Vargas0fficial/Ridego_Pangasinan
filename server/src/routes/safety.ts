import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { HttpError, h } from '../lib/errors';
import { notifyTrustedContacts } from '../lib/notify';
import { Report } from '../models/Report';
import { Ride } from '../models/Ride';
import type { UserDoc } from '../models/User';
import { getIO } from '../realtime/hub';

export const safetyRouter = Router();

const optionalRide = z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid ride id').optional();

const emergencyS = z.object({
  rideId: optionalRide,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/** Stores the alert, tells the (future) safety dashboard, and notifies trusted contacts. */
safetyRouter.post(
  '/emergency',
  requireAuth(),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const b = emergencyS.parse(req.body);
    let trackUrl: string | undefined;
    if (b.rideId) {
      const ride = await Ride.findOne({
        _id: b.rideId,
        $or: [{ passenger: user._id }, { rider: user._id }],
      }).select('shareToken');
      if (!ride) throw new HttpError(404, 'Ride not found');
      trackUrl = `/track/${ride.shareToken}`;
    }
    const alert = await Report.create({
      user: user._id,
      ride: b.rideId ?? null,
      type: 'emergency',
      reason: 'Emergency alert',
      lat: b.lat,
      lng: b.lng,
    });
    getIO().to('admins').emit('safety:alert', { id: String(alert._id), user: user.name, lat: b.lat, lng: b.lng, rideId: b.rideId });
    const notified = await notifyTrustedContacts(user, { lat: b.lat, lng: b.lng, trackUrl });
    res.status(201).json({ id: String(alert._id), notified, at: alert.createdAt });
  }),
);

safetyRouter.post(
  '/emergency/:id/cancel',
  requireAuth(),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) throw new HttpError(400, 'Invalid alert id');
    const r = await Report.updateOne({ _id: id, user: user._id, type: 'emergency', status: 'open' }, { $set: { status: 'cancelled' } });
    if (r.modifiedCount === 0) throw new HttpError(404, 'Alert not found');
    res.json({ ok: true });
  }),
);

const reportS = z.object({
  rideId: optionalRide,
  type: z.enum(['report', 'support']).default('report'),
  reason: z.string().trim().min(2).max(80),
  details: z.string().trim().max(1000).optional(),
});

safetyRouter.post(
  '/report',
  requireAuth(),
  h(async (req, res) => {
    const user = res.locals.user as UserDoc;
    const b = reportS.parse(req.body);
    const report = await Report.create({ user: user._id, ride: b.rideId ?? null, type: b.type, reason: b.reason, details: b.details });
    res.status(201).json({ id: String(report._id) });
  }),
);
