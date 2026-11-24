import { config } from '../config';
import { HttpError } from './errors';
import { mailHtml, mailSubject, mailText, newCode } from './verification';

const SEND_FAILED = "We couldn't send the email. Please check the address and try again in a moment.";

/**
 * Sends one email. With MAIL_PROVIDER=console (the default) nothing leaves the server:
 * the email is printed, so you can develop without an email account.
 * Brevo is called over HTTPS on purpose: free Render services block the normal SMTP ports.
 */
async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  if (config.mail.provider === 'console') {
    console.log(`[mail:console] to ${to}\n  subject: ${subject}\n  ${text.split('\n')[0]}`);
    return;
  }

  let res: Response;
  try {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': config.mail.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: config.mail.fromName, email: config.mail.fromEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[mail] request failed', err instanceof Error ? err.message : err);
    throw new HttpError(502, SEND_FAILED);
  }
  if (!res.ok) {
    console.error('[mail] provider error', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, SEND_FAILED);
  }
}

/** Emails a fresh 6-digit confirmation code and returns it, so the caller can store its hash. */
export async function deliverCode(email: string): Promise<string> {
  const code = newCode();
  await sendMail(email, mailSubject(code), mailText(code), mailHtml(code));
  return code;
}

/** "juan.delacruz@gmail.com" -> "j***@gmail.com" */
export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}***@${domain}`;
};