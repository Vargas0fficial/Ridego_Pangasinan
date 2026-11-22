import type http from 'http';
import { Types } from 'mongoose';
import { Server } from 'socket.io';
import { config } from '../config';
import { verifyToken } from '../lib/auth';
import { User } from '../models/User';
import { Ride, ACTIVE_STATUSES, WITH_RIDER_STATUSES } from '../models/Ride';
import { getIO, riderRides, setIO } from './hub';

type Ack = (res: { ok: boolean; error?: string }) => void;

/** userId -> open socket count. A rider whose last socket drops goes offline after a short grace period. */
const presence = new Map<string, number>();
const GRACE_MS = 30_000;

export function initSocket(server: http.Server): Server {
  const io = new Server(server, {
    cors: { origin: config.clientOrigins, credentials: true },
    pingInterval: 10_000,
    pingTimeout: 8_000,
  });
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('missing token');
      const user = await User.findById(verifyToken(token)).select('role');
      if (!user) throw new Error('unknown user');
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const uid = socket.data.userId as string;
    const role = socket.data.role as 'passenger' | 'rider';
    socket.join('user:' + uid);
    presence.set(uid, (presence.get(uid) ?? 0) + 1);

    try {
      const ride = await Ride.findOne({
        [role]: uid,
        status: { $in: role === 'rider' ? WITH_RIDER_STATUSES : ACTIVE_STATUSES },
      }).select('_id');
      if (ride) socket.join('ride:' + String(ride._id));
    } catch (err) {
      console.error('[socket] could not join ride room', err);
    }

    // Riders stream GPS pings here. Passengers watching the ride get them in real time.
    socket.on('rider:location', (p: { lat?: number; lng?: number; heading?: number }) => {
      if (role !== 'rider' || !p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
      const now = Date.now();
      if (now - ((socket.data.lastPing as number) ?? 0) < 400) return;
      socket.data.lastPing = now;
      const lat = p.lat as number;
      const lng = p.lng as number;
      const active = riderRides.get(uid);
      if (active) {
        getIO().to('ride:' + active.rideId).emit('rider:location', { rideId: active.rideId, lat, lng, heading: p.heading });
        getIO().of('/track').to('track:' + active.token).emit('track:location', { lat, lng });
      }
      if (now - ((socket.data.lastSave as number) ?? 0) > 5000) {
        socket.data.lastSave = now;
        User.updateOne({ _id: uid }, { $set: { lat, lng, locationAt: new Date() } }).catch(() => undefined);
      }
    });

    socket.on('chat:send', async (payload: { rideId?: string; text?: string }, ack?: Ack) => {
      try {
        const text = typeof payload?.text === 'string' ? payload.text.trim().slice(0, 500) : '';
        if (!text || !payload.rideId || !Types.ObjectId.isValid(payload.rideId)) throw new Error('Message is empty');
        const at = new Date();
        const ride = await Ride.findOneAndUpdate(
          { _id: payload.rideId, status: { $in: WITH_RIDER_STATUSES }, [role]: uid },
          { $push: { messages: { from: role, text, at } } },
        ).select('_id');
        if (!ride) throw new Error('Chat is only available during an active ride');
        getIO().to('ride:' + payload.rideId).emit('chat:message', { rideId: payload.rideId, from: role, text, at });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : 'Could not send message' });
      }
    });

    socket.on('disconnect', () => {
      const left = (presence.get(uid) ?? 1) - 1;
      if (left > 0) {
        presence.set(uid, left);
        return;
      }
      presence.delete(uid);
      if (role === 'rider') {
        setTimeout(() => {
          if ((presence.get(uid) ?? 0) === 0) {
            User.updateOne({ _id: uid, activeRideId: null }, { $set: { isOnline: false } }).catch(() => undefined);
          }
        }, GRACE_MS);
      }
    });
  });

  // Public namespace for the shareable trip link. Viewers only join a room named by the unguessable token.
  io.of('/track').on('connection', (socket) => {
    socket.on('track:join', (token: unknown) => {
      if (typeof token === 'string' && /^[a-f0-9]{16,64}$/.test(token)) socket.join('track:' + token);
    });
  });

  return io;
}
