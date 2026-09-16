import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { MailDriver, MailMessage } from '../mail.interface.js';
import { AppConfigService } from '../../../config/config.service.js';

/**
 * SMTP delivery. Works with Gmail/Google Workspace, Resend, Postmark and any
 * standard SMTP provider.
 */
@Injectable()
export class SmtpMailDriver implements MailDriver {
  readonly name = 'smtp' as const;
  private readonly logger = new Logger(SmtpMailDriver.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: AppConfigService) {
    const smtp = this.config.mail.smtp;
    if (!smtp) {
      throw new Error('SmtpMailDriver constructed without SMTP configuration');
    }

    this.from = this.config.mail.from;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      // Implicit TLS on 465; STARTTLS upgrade on 587.
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });

    this.logger.log(`SMTP transport ready: ${smtp.host}:${smtp.port}`);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
