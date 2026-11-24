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

export const mailSubject = (code: string): string => `${code} is your RideGo Pangasinan code`;

export const mailText = (code: string): string =>
  `Your RideGo Pangasinan verification code is ${code}.\n\nIt expires in ${config.verification.codeTtlSeconds / 60} minutes. Never share this code with anyone.\n\nIf you did not try to sign up, you can ignore this email.`;

export const mailHtml = (code: string): string =>
  `<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#0A2130">
  <h2 style="margin:0 0 8px;color:#0B9A55">RideGo Pangasinan</h2>
  <p style="margin:0 0 16px">Your verification code is:</p>
  <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${code}</p>
  <p style="margin:0 0 8px;color:#587084">It expires in ${config.verification.codeTtlSeconds / 60} minutes. Never share this code with anyone.</p>
  <p style="margin:0;color:#587084;font-size:12px">If you did not try to sign up, you can ignore this email.</p>
</div>`;