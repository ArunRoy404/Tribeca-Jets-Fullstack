export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Always populated — some clients never render HTML. */
  text: string;
  html?: string;
}

/**
 * Contract every mail backend implements.
 *
 * Mirrors the storage driver pattern: which backend is active is decided once
 * at boot from env, and feature code never branches on it.
 */
export interface MailDriver {
  readonly name: 'smtp' | 'log';
  send(message: MailMessage): Promise<void>;
}

export const MAIL_DRIVER = Symbol('MAIL_DRIVER');
