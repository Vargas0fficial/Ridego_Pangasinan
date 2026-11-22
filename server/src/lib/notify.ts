import type { UserDoc } from '../models/User';

/**
 * Placeholder for notifying trusted contacts during an emergency.
 * Plug an SMS provider in here (Semaphore, Twilio, Vonage...) and send the live trip link.
 * For now it only logs, and returns how many contacts would be notified.
 */
export async function notifyTrustedContacts(
  user: UserDoc,
  info: { lat?: number; lng?: number; trackUrl?: string },
): Promise<number> {
  const contacts = user.trustedContacts ?? [];
  for (const c of contacts) {
    console.log(`[safety] would notify ${c.name} (${c.phone}) about ${user.name}`, info);
  }
  return contacts.length;
}
