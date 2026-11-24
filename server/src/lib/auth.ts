import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { config } from '../config';
import { User, ratingOf, type UserDoc } from '../models/User';

export const signToken = (userId: string): string => jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '14d' });

export const verifyToken = (token: string): string => {
  const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
  return payload.sub;
};

/** Accepts 09XXXXXXXXX, 639XXXXXXXXX or +639XXXXXXXXX and returns +639XXXXXXXXX. */
export function normalizePhone(raw: string): string {
  const s = raw.replace(/[\s-]/g, '');
  if (/^09\d{9}$/.test(s)) return '+63' + s.slice(1);
  if (/^639\d{9}$/.test(s)) return '+' + s;
  return s;
}

export const requireAuth =
  (role?: 'passenger' | 'rider'): RequestHandler =>
  async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        res.status(401).json({ error: 'Please sign in to continue' });
        return;
      }
      const user = await User.findById(verifyToken(token));
      if (!user) {
        res.status(401).json({ error: 'Account not found. Please sign in again.' });
        return;
      }
      if (role && user.role !== role) {
        res.status(403).json({ error: `This action needs a ${role} account` });
        return;
      }
      res.locals.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }
  };

export function publicUser(u: UserDoc) {
  return {
    id: String(u._id),
    name: u.name,
    phone: u.phone,
    email: u.email ?? null,
    photo: u.photo ?? null,
    role: u.role,
    rating: ratingOf(u),
    ratingCount: u.ratingCount,
    vehicle: u.vehicle ? { model: u.vehicle.model, plate: u.vehicle.plate, color: u.vehicle.color } : null,
    isOnline: u.isOnline,
    completedRides: u.completedRides,
    trustedContacts: (u.trustedContacts ?? []).map((c) => ({ name: c.name, phone: c.phone })),
  };
}