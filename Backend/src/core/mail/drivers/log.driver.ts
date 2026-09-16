import { Injectable, Logger } from '@nestjs/common';
import type { MailDriver, MailMessage } from '../mail.interface.js';

/**
 * Development fallback used when no SMTP credentials are configured.
 *
 * Prints the message to the server log so the two-factor and password-reset
 * flows are fully testable before the client provides a mail account. It
 * refuses to be used in production — see MailModule.
 */
@Injectable()
export class LogMailDriver implements MailDriver {
  readonly name = 'log' as const;
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage): Promise<void> {
    this.logger.warn(
      [
        '',
        '──────────── EMAIL (not actually sent — no SMTP configured) ────────────',
        `  To:      ${message.to}`,
        `  Subject: ${message.subject}`,
        '',
        message.text
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
        '────────────────────────────────────────────────────────────────────────',
      ].join('\n'),
    );
  }
}
