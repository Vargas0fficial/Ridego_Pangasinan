import crypto from 'node:crypto';
import { config } from '../config';

/** A random 6-digit code, zero padded. */
export const newCode = (): string => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** Codes are never stored in plain text. The phone number is mixed in so the same code hashes differently per number. */
export const hashCode = (phone: string, code: string): string =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${phone}:${code}`).digest('hex');

export function codeMatches(phone: string, code: string, expectedHash: string): boolean {
  const a = Buffer.from(hashCode(phone, code), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const smsText = (code: string): string =>
  `RideGo Pangasinan: your verification code is ${code}. It expires in ${config.verification.codeTtlSeconds / 60} minutes. Never share this code with anyone.`;