import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { PendingSignup } from '../models/PendingSignup';
import { User, type UserDoc } from '../models/User';
import { normalizePhone, publicUser, requireAuth, signToken } from '../lib/auth';
import { HttpError, h } from '../lib/errors';
import { deliverCode } from '../lib/sms';
import { codeMatches, hashCode } from '../lib/verification';

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

const phoneS = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+639\d{9}$/, 'Enter a valid Philippine mobile number, like 09171234567'));

const registerS = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(60),
    phone: phoneS,
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    role: z.enum(['passenger', 'rider']),
    vehicle: z
      .object({
        model: z.string().trim().min(2).max(40),
        plate: z
          .string()
          .trim()
          .min(3)
          .max(12)
          .transform((s) => s.toUpperCase()),
        color: z.string().trim().min(2).max(20),
      })
      .optional(),
  })
  .refine((d) => d.role !== 'rider' || !!d.vehicle, { message: 'Riders need motorcycle details', path: ['vehicle'] });

const sendLimiter = rateLimit({ windowMs: 60_000, limit: 6, standardHeaders: true, legacyHeaders: false });
const { codeTtlSeconds, maxAttempts, resendCooldownSeconds, maxSends } = config.verification;

/** In production the console provider prints codes instead of texting them, so nobody could ever receive one. */
const requireRealSms = () => {
  if (config.isProd && config.sms.provider === 'console') {
    throw new HttpError(503, 'Sign-up is temporarily unavailable. Please try again later.');
  }
};

const challenge = (phone: string) => ({
  phone,
  expiresInSeconds: codeTtlSeconds,
  resendInSeconds: resendCooldownSeconds,
});

// Step 1: validate the form, park it as a pending sign-up and text a code.
authRouter.post(
  '/register',
  sendLimiter,
  h(async (req, res) => {
    requireRealSms();
    const b = registerS.parse(req.body);
    if (await User.exists({ phone: b.phone })) {
      throw new HttpError(409, 'This number is already registered. Please log in instead.');
    }
    const code = await deliverCode(b.phone);
    const now = new Date();
    await PendingSignup.findOneAndUpdate(
      { phone: b.phone },
      {
        phone: b.phone,
        name: b.name,
        passwordHash: await bcrypt.hash(b.password, 10),
        role: b.role,
        vehicle: b.role === 'rider' ? b.vehicle : undefined,
        codeHash: hashCode(b.phone, code),
        attempts: 0,
        sendCount: 1,
        lastSentAt: now,
        expiresAt: new Date(now.getTime() + codeTtlSeconds * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(202).json(challenge(b.phone));
  }),
);

const verifyS = z.object({ phone: phoneS, code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') });

// Step 2: check the code and create the real account.
authRouter.post(
  '/register/verify',
  sendLimiter,
  h(async (req, res) => {
    const b = verifyS.parse(req.body);
    const pending = await PendingSignup.findOne({ phone: b.phone });
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, 'This code has expired. Please request a new one.');
    }
    if (pending.attempts >= maxAttempts) {
      throw new HttpError(429, 'Too many wrong tries. Please request a new code.');
    }
    if (!codeMatches(b.phone, b.code, pending.codeHash)) {
      const updated = await PendingSignup.findOneAndUpdate({ phone: b.phone }, { $inc: { attempts: 1 } }, { new: true });
      const left = Math.max(0, maxAttempts - (updated?.attempts ?? maxAttempts));
      throw new HttpError(400, left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Please request a new code.');
    }
    // Delete first so a double submit cannot create two accounts.
    const taken = await PendingSignup.findOneAndDelete({ phone: b.phone });
    if (!taken) throw new HttpError(400, 'This code was already used. Please log in.');
    const user = await User.create({
      name: taken.name,
      phone: taken.phone,
      passwordHash: taken.passwordHash,
      role: taken.role,
      vehicle: taken.role === 'rider' ? taken.vehicle : undefined,
    });
    res.status(201).json({ token: signToken(String(user._id)), user: publicUser(user) });
  }),
);

// Send a fresh code for a pending sign-up.
authRouter.post(
  '/register/resend',
  sendLimiter,
  h(async (req, res) => {
    requireRealSms();
    const b = z.object({ phone: phoneS }).parse(req.body);
    const pending = await PendingSignup.findOne({ phone: b.phone });
    if (!pending) throw new HttpError(400, 'Your sign-up expired. Please fill in the form again.');
    const wait = Math.ceil((pending.lastSentAt.getTime() + resendCooldownSeconds * 1000 - Date.now()) / 1000);
    if (wait > 0) throw new HttpError(429, `Please wait ${wait}s before asking for another code.`);
    if (pending.sendCount >= maxSends) throw new HttpError(429, 'Too many codes requested. Please try again later.');

    const code = await deliverCode(b.phone);
    const now = new Date();
    pending.codeHash = hashCode(b.phone, code);
    pending.attempts = 0;
    pending.sendCount += 1;
    pending.lastSentAt = now;
    pending.expiresAt = new Date(now.getTime() + codeTtlSeconds * 1000);
    await pending.save();
    res.status(202).json(challenge(b.phone));
  }),
);

const loginS = z.object({ phone: phoneS, password: z.string().min(1, 'Enter your password') });

authRouter.post(
  '/login',
  limiter,
  h(async (req, res) => {
    const b = loginS.parse(req.body);
    const user = await User.findOne({ phone: b.phone });
    if (!user || !(await bcrypt.compare(b.password, user.passwordHash))) {
      throw new HttpError(401, 'Wrong phone number or password');
    }
    res.json({ token: signToken(String(user._id)), user: publicUser(user) });
  }),
);

authRouter.get(
  '/me',
  requireAuth(),
  h(async (_req, res) => {
    res.json({ user: publicUser(res.locals.user as UserDoc) });
  }),
);

const contactsS = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        phone: z.string().trim().min(7).max(20),
      }),
    )
    .max(5, 'You can add up to 5 trusted contacts'),
});

authRouter.put(
  '/contacts',
  requireAuth(),
  h(async (req, res) => {
    const b = contactsS.parse(req.body);
    const user = res.locals.user as UserDoc;
    user.trustedContacts = b.contacts;
    await user.save();
    res.json({ user: publicUser(user) });
  }),
);