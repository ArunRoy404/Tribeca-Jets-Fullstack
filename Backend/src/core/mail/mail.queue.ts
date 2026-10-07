import type { MailMessage } from './mail.interface.js';

/**
 * Every outbound email is a job on this queue (BullMQ, on the app's Redis).
 * The request that triggers an email — an invitation, a reset code, a broker
 * sending a quote — answers as soon as the job is stored; the worker in
 * `mail.processor.ts` talks to the mail server afterwards. Redis runs with
 * append-only persistence, so a queued email survives a restart.
 */
export const MAIL_QUEUE = 'mail';

export interface MailJob {
  message: MailMessage;
  /**
   * Set for a message a person composed (Email Templates, #21): the
   * `EmailMessage` row the worker moves from QUEUED to SENT, LOGGED or
   * FAILED. Absent for account emails, which have no row.
   */
  emailMessageId?: string;
}

/**
 * Five tries over roughly two and a half minutes (5s, 10s, 20s, 40s, 80s).
 * A mail server that is briefly unreachable is the common failure, and it
 * clears on its own; a refusal does not, and stops at once (below).
 */
export const MAIL_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
} as const;

/**
 * True when retrying cannot help: the server answered with a permanent
 * (5xx) SMTP code — a sender it will not accept, an address that does not
 * exist. Retrying those only delays the honest FAILED.
 */
export function isPermanentMailFailure(error: unknown): boolean {
  const code = (error as { responseCode?: unknown } | null)?.responseCode;
  return typeof code === 'number' && code >= 500 && code < 600;
}
