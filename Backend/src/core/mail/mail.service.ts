import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAIL_DRIVER, type MailDriver, type MailMessage } from './mail.interface.js';
import { AppConfigService } from '../../config/config.service.js';
import { renderEmail, renderMessage } from './mail.layout.js';

/**
 * The only mail entry point feature modules should use.
 *
 * Templates live here rather than in the auth module so every outbound email
 * shares one voice and one set of safety rules.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_DRIVER) private readonly driver: MailDriver,
    private readonly config: AppConfigService,
  ) {}

  get driverName() {
    return this.driver.name;
  }

  /**
   * Delivery failures are logged, not thrown.
   *
   * A failed send must not turn into a 500 that tells an attacker their target
   * address exists, and must not roll back the code that was already issued —
   * the user can simply request a resend.
   */
  private async send(
    to: string,
    subject: string,
    body: { text: string; html: string },
  ): Promise<void> {
    try {
      await this.driver.send({ to, subject, ...body });
    } catch (error) {
      this.logger.error(
        `Failed to send "${subject}" to ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * A message a person composed — an email to a client or an operator
   * (Email Templates, #21). Unlike the account emails above, the outcome is
   * **reported, not swallowed**: the desk must know whether a quote went out,
   * and the record of it must say which.
   *
   * `delivered` is false under the log driver — printed to the server log,
   * delivered to nobody — so the caller can record exactly that rather than
   * "sent". A mail server's refusal comes back as `error`.
   */
  async deliver(
    message: MailMessage,
  ): Promise<{ delivered: boolean; error: string | null }> {
    try {
      // A composed message goes out in the same shell as every other email,
      // with the plain text kept for clients that never render HTML.
      await this.driver.send({
        ...message,
        html: message.html ?? renderMessage(message.text, message.text.slice(0, 120)),
      });
      return { delivered: this.driver.name === 'smtp', error: null };
    } catch (error) {
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        delivered: false,
        error: error instanceof Error ? error.message : 'The mail server refused the message',
      };
    }
  }

  async sendTwoFactorCode(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const caption = `Expires in ${expiresInMinutes} minutes · Single use`;
    const notice =
      'Didn\u2019t try to sign in? Someone may know your password. Change it right away and let your administrator know.';
    await this.send(to, 'Your Tribeca Jets sign-in code', {
      text: lines([
        `Hi ${firstName},`,
        '',
        `Your sign-in verification code is: ${code}`,
        caption,
        '',
        notice,
      ]),
      html: renderEmail({
        preheader: `Your sign-in code is ${code}. It expires in ${expiresInMinutes} minutes.`,
        eyebrow: 'Sign-in verification',
        heading: 'Your sign-in code',
        paragraphs: [`Hi ${firstName},`, 'Enter this code to finish signing in to Tribeca Jets Command Center.'],
        code: { value: code, caption },
        notice,
      }),
    });
  }

  /**
   * Carries no credential and no access link.
   *
   * The invited account has no usable password, so the invitee sets one via
   * the normal password-reset flow. The button opens that flow's first
   * screen — it grants nothing by itself; the code it leads to is mailed
   * separately. Mailing a temporary password or a sign-in-on-click link
   * would put a working credential in an inbox.
   */
  async sendInvitation(
    to: string,
    firstName: string,
    invitedByName: string,
  ): Promise<void> {
    const setUp = `${this.config.webAppUrl}/forgot-password`;
    await this.send(to, 'You\u2019re invited to Tribeca Jets Command Center', {
      text: lines([
        `Hi ${firstName},`,
        '',
        `${invitedByName} has created an account for you at Tribeca Jets Command Center.`,
        '',
        `To set your password, open ${setUp} and enter this email address (${to}).`,
        'We will email you a code to choose your own password.',
        '',
        'Not expecting this? You can ignore this email.',
      ]),
      html: renderEmail({
        preheader: `${invitedByName} has invited you to Tribeca Jets Command Center.`,
        eyebrow: 'Invitation',
        heading: 'Welcome aboard',
        paragraphs: [
          `Hi ${firstName},`,
          `${invitedByName} has created an account for you at Tribeca Jets Command Center.`,
          `To get started, choose your own password. On the next screen, enter ${to} and we will email you a 6-digit code.`,
        ],
        button: { label: 'Set Your Password', href: setUp },
        notice: 'Not expecting this invitation? You can safely ignore this email \u2014 nothing happens until a password is set.',
      }),
    });
  }

  async sendPasswordResetCode(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const caption = `Expires in ${expiresInMinutes} minutes · Single use`;
    const notice =
      'Didn\u2019t ask to reset your password? You can ignore this email \u2014 your password has not been changed.';
    await this.send(to, 'Reset your Tribeca Jets password', {
      text: lines([`Hi ${firstName},`, '', `Your password reset code is: ${code}`, caption, '', notice]),
      html: renderEmail({
        preheader: `Your password reset code is ${code}.`,
        eyebrow: 'Password reset',
        heading: 'Reset your password',
        paragraphs: [`Hi ${firstName},`, 'Enter this code to choose a new password for your account.'],
        code: { value: code, caption },
        notice,
      }),
    });
  }

  /**
   * Sent after any password change — a reset or a signed-in change. Not a
   * courtesy: it is how a user finds out their account was taken over if
   * someone else did it.
   */
  async sendPasswordChangedNotice(to: string, firstName: string): Promise<void> {
    const signIn = `${this.config.webAppUrl}/sign-in`;
    const notice = 'Didn\u2019t make this change? Contact your administrator immediately.';
    await this.send(to, 'Your Tribeca Jets password was changed', {
      text: lines([
        `Hi ${firstName},`,
        '',
        'Your password was just changed, and your other signed-in devices were signed out.',
        '',
        notice,
        '',
        `Sign in: ${signIn}`,
      ]),
      html: renderEmail({
        preheader: 'Your password was just changed.',
        eyebrow: 'Security notice',
        heading: 'Your password was changed',
        paragraphs: [
          `Hi ${firstName},`,
          'Your password was just changed, and your other signed-in devices were signed out.',
        ],
        button: { label: 'Sign In', href: signIn },
        notice,
      }),
    });
  }
}

/** A plain-text body from lines, signed the same way every time. */
function lines(body: string[]): string {
  return [...body, '', '\u2014 Tribeca Jets Command Center'].join('\n');
}
