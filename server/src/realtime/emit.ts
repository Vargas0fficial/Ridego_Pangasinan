import type { Types } from 'mongoose';
import { Ride } from '../models/Ride';
import { serializeRide, serializeTrack } from '../lib/serialize';
import { getIO } from './hub';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function loadRide(id: string | Types.ObjectId): Promise<any | null> {
  return Ride.findById(id)
    .populate('passenger', 'name phone ratingSum ratingCount')
    .populate('rider', 'name phone vehicle ratingSum ratingCount completedRides lat lng')
    .lean();
}

export async function loadRides(filter: Record<string, unknown>, limit = 30): Promise<any[]> {
  return Ride.find(filter as any)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('passenger', 'name phone ratingSum ratingCount')
    .populate('rider', 'name phone vehicle ratingSum ratingCount completedRides lat lng')
    .lean();
}

/** Send the latest ride state to the passenger, the rider and anyone watching the shared trip link. */
export async function pushRide(id: string | Types.ObjectId): Promise<any | null> {
  const ride = await loadRide(id);
  if (!ride) return null;
  const io = getIO();
  io.to('user:' + String(ride.passenger._id)).emit('ride:update', serializeRide(ride, 'passenger'));
  if (ride.rider) io.to('user:' + String(ride.rider._id)).emit('ride:update', serializeRide(ride, 'rider'));
  io.of('/track').to('track:' + ride.shareToken).emit('track:update', serializeTrack(ride));
  return ride;
}
