import { config } from '../config';
import { HttpError } from './errors';
import { newCode, smsText } from './verification';

/** "+639171234567" -> "09171234567" (the format Semaphore expects). */
const toLocal = (e164: string): string => '0' + e164.slice(3);

/**
 * Sends one text message. With SMS_PROVIDER=console (the default) nothing leaves the server:
 * the message is printed, so you can develop without paying for SMS.
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  if (config.sms.provider === 'iprog') throw new Error('iprog sends codes through deliverCode()');
  if (config.sms.provider === 'console') {
    console.log(`[sms:console] to ${phone}: ${message}`);
    return;
  }

  const body = new URLSearchParams({ apikey: config.sms.semaphoreApiKey, number: toLocal(phone), message });
  if (config.sms.senderName) body.set('sendername', config.sms.senderName);

  let res: Response;
  try {
    res = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[sms] request failed', err);
    throw new HttpError(502, "We couldn't send the text message. Please try again in a moment.");
  }
  if (!res.ok) {
    console.error('[sms] provider error', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, "We couldn't send the text message. Please try again in a moment.");
  }
}

const SEND_FAILED = "We couldn't send the text message. Please try again in a moment.";

/** iPROG's OTP route. It creates the 6-digit code itself and returns it, so we read it back and keep only a hash. */
async function sendIprogOtp(phone: string): Promise<string> {
  const url = new URL('https://www.iprogsms.com/api/v1/otp/send_otp');
  url.searchParams.set('api_token', config.sms.iprogApiToken);
  url.searchParams.set('phone_number', phone.slice(1)); // "+639..." -> "639..."
  url.searchParams.set('expires_in_minutes', String(config.verification.codeTtlSeconds / 60));
  url.searchParams.set('message', `Your verification code is :otp. It expires in ${config.verification.codeTtlSeconds / 60} minutes. Never share this code with anyone.`);

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    console.error('[sms] iprog request failed', err instanceof Error ? err.message : err);
    throw new HttpError(502, SEND_FAILED);
  }
  const json = (await res.json().catch(() => null)) as { status?: unknown; message?: unknown; data?: { otp_code?: unknown } } | null;
  const code = json?.data?.otp_code;
  if (!res.ok || json?.status !== 'success' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    console.error('[sms] iprog error', res.status, json?.status, json?.message);
    throw new HttpError(502, SEND_FAILED);
  }
  return code;
}

/**
 * Sends a confirmation code to the phone and returns it, so the caller can store its hash.
 * console and semaphore: we make the code and text it. iprog: iPROG makes it and we read it back.
 */
export async function deliverCode(phone: string): Promise<string> {
  if (config.sms.provider === 'iprog') return sendIprogOtp(phone);
      const code = await deliverCode(b.phone);
  await sendSms(phone, smsText(code));
  return code;
}