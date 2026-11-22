import { config } from '../config';
import { HttpError } from './errors';

/** "+639171234567" -> "09171234567" (the format Semaphore expects). */
const toLocal = (e164: string): string => '0' + e164.slice(3);

/**
 * Sends one text message. With SMS_PROVIDER=console (the default) nothing leaves the server:
 * the message is printed, so you can develop without paying for SMS.
 */
export async function sendSms(phone: string, message: string): Promise<void> {
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