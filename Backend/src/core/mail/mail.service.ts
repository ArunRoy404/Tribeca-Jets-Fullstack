import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAIL_DRIVER, type MailDriver } from './mail.interface.js';
import { AppConfigService } from '../../config/config.service.js';

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
    text: string,
  ): Promise<void> {
    try {
      await this.driver.send({ to, subject, text });
    } catch (error) {
      this.logger.error(
        `Failed to send "${subject}" to ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async sendTwoFactorCode(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    await this.send(
      to,
      'Your Tribeca Jets sign-in code',
      [
        `Hi ${firstName},`,
        '',
        `Your sign-in verification code is: ${code}`,
        '',
        `This code expires in ${expiresInMinutes} minutes and can be used once.`,
        '',
        'If you did not try to sign in, someone may have your password.',
        'Change it immediately.',
        '',
        '— Tribeca Jets Command Center',
      ].join('\n'),
    );
  }

  /**
   * Carries no credential and no link.
   *
   * The invited account has no usable password, so the invitee sets one via
   * the normal password-reset flow. Mailing a temporary password — or a
   * link that grants access on click — would put a working credential in an
   * inbox, which is the thing the reset flow exists to avoid.
   */
  async sendInvitation(
    to: string,
    firstName: string,
    invitedByName: string,
  ): Promise<void> {
    await this.send(
      to,
      'You have been invited to Tribeca Jets Command Center',
      [
        `Hi ${firstName},`,
        '',
        `${invitedByName} has created an account for you at Tribeca Jets Command Center.`,
        '',
        'To get started, open the sign-in page, choose "Forgot password?",',
        `and enter this email address (${to}). You will receive a code to set`,
        'your own password.',
        '',
        'If you were not expecting this invitation, you can ignore this email.',
        '',
        '— Tribeca Jets Command Center',
      ].join('\n'),
    );
  }

  async sendPasswordResetCode(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    await this.send(
      to,
      'Reset your Tribeca Jets password',
      [
        `Hi ${firstName},`,
        '',
        `Your password reset code is: ${code}`,
        '',
        `This code expires in ${expiresInMinutes} minutes and can be used once.`,
        '',
        'If you did not request a password reset, you can ignore this email —',
        'your password has not been changed.',
        '',
        '— Tribeca Jets Command Center',
      ].join('\n'),
    );
  }

  /**
   * Sent after a successful reset. Not a courtesy: it is how a user finds out
   * their account was taken over if someone else completed the flow.
   */
  async sendPasswordChangedNotice(to: string, firstName: string): Promise<void> {
    await this.send(
      to,
      'Your Tribeca Jets password was changed',
      [
        `Hi ${firstName},`,
        '',
        'Your password was just changed and all other sessions were signed out.',
        '',
        'If this was not you, contact your administrator immediately.',
        '',
        `Sign in: ${this.config.webAppUrl}/sign-in`,
        '',
        '— Tribeca Jets Command Center',
      ].join('\n'),
    );
  }
}
