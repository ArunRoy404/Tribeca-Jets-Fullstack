import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { MAIL_DRIVER, type MailDriver, type MailMessage } from './mail.interface.js';
import { MAIL_JOB_OPTIONS, MAIL_QUEUE, type MailJob } from './mail.queue.js';
import { AppConfigService } from '../../config/config.service.js';
import { renderEmail, renderMessage, type EmailBrand } from './mail.layout.js';
import { SettingsService } from '../../modules/settings/settings.service.js';
import { brandingView } from '../../modules/settings/settings.view.js';

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
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue<MailJob>,
    private readonly config: AppConfigService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * The company as Settings names it, for the email's header, footer and
   * wording. The logo is the public branding route made absolute on the web
   * app's address — an inbox fetches it with no session, from outside.
   */
  private async brand(): Promise<EmailBrand> {
    const branding = brandingView(await this.settings.read());
    return {
      name: branding.companyName,
      logoUrl: branding.logoUrl ? `${this.config.webAppUrl}${branding.logoUrl}` : null,
    };
  }

  get driverName() {
    return this.driver.name;
  }

  /**
   * Queues an account email and returns at once; the worker
   * (`mail.processor.ts`) sends it, retrying a mail server that is briefly
   * unreachable. Nothing here throws on a delivery problem — that happens
   * later, off the request — and a failure to *queue* is logged, not
   * thrown: it must not turn into a 500 that tells an attacker their target
   * address exists, and must not roll back a code already issued. The user
   * can ask for a resend.
   */
  private async send(
    to: string,
    subject: string,
    body: { text: string; html: string },
  ): Promise<void> {
    try {
      await this.queue.add('account', { message: { to, subject, ...body } }, MAIL_JOB_OPTIONS);
    } catch (error) {
      this.logger.error(
        `Could not queue "${subject}" to ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Queues a message a person composed (Email Templates, #21), wrapped in the
   * same shell as every other email. The caller has already written its
   * `EmailMessage` row as QUEUED; the worker moves it to SENT, LOGGED or
   * FAILED. Unlike `send`, a failure to queue **is** thrown — the broker is
   * waiting on this one and must not be told it is on its way when it is not.
   */
  async enqueue(message: MailMessage, emailMessageId: string): Promise<void> {
    await this.queue.add(
      'composed',
      {
        message: {
          ...message,
          html: message.html ?? renderMessage(message.text, message.text.slice(0, 120), await this.brand()),
        },
        emailMessageId,
      },
      MAIL_JOB_OPTIONS,
    );
  }

  async sendTwoFactorCode(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const brand = await this.brand();
    const caption = `Expires in ${expiresInMinutes} minutes · Single use`;
    const notice =
      'Didn\u2019t try to sign in? Someone may know your password. Change it right away and let your administrator know.';
    await this.send(to, `Your ${brand.name} sign-in code`, {
      text: lines(brand, [
        `Hi ${firstName},`,
        '',
        `Your sign-in verification code is: ${code}`,
        caption,
        '',
        notice,
      ]),
      html: renderEmail({
        brand,
        preheader: `Your sign-in code is ${code}. It expires in ${expiresInMinutes} minutes.`,
        eyebrow: 'Sign-in verification',
        heading: 'Your sign-in code',
        paragraphs: [`Hi ${firstName},`, `Enter this code to finish signing in to ${brand.name} Command Center.`],
        code: { value: code, caption },
        notice,
      }),
    });
  }

  /**
   * The invitation, carrying the first password the administrator chose
   * (owner's decision, 6 Oct 2026). It is a credential in an inbox, so the
   * email says so and asks for it to be changed from My Account.
   */
  async sendInvitation(
    to: string,
    firstName: string,
    invitedByName: string,
    password: string,
  ): Promise<void> {
    const brand = await this.brand();
    const signIn = `${this.config.webAppUrl}/sign-in`;
    const advice =
      'For your security, change this password after you sign in: open your profile menu, choose My Account, then Change Password.';
    await this.send(to, `You\u2019re invited to ${brand.name} Command Center`, {
      text: lines(brand, [
        `Hi ${firstName},`,
        '',
        `${invitedByName} has created an account for you at ${brand.name} Command Center.`,
        '',
        `Sign in at ${signIn}`,
        `Email: ${to}`,
        `Password: ${password}`,
        '',
        advice,
        '',
        'Not expecting this? You can ignore this email.',
      ]),
      html: renderEmail({
        brand,
        preheader: `${invitedByName} has invited you to ${brand.name} Command Center.`,
        eyebrow: 'Invitation',
        heading: 'Welcome aboard',
        paragraphs: [
          `Hi ${firstName},`,
          `${invitedByName} has created an account for you at ${brand.name} Command Center. Here are your sign-in details:`,
        ],
        credentials: [
          { label: 'Email', value: to },
          { label: 'Password', value: password },
        ],
        button: { label: 'Sign In', href: signIn },
        notice: advice,
      }),
    });
  }

  async sendPasswordResetCode(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const brand = await this.brand();
    const caption = `Expires in ${expiresInMinutes} minutes · Single use`;
    const notice =
      'Didn\u2019t ask to reset your password? You can ignore this email \u2014 your password has not been changed.';
    await this.send(to, `Reset your ${brand.name} password`, {
      text: lines(brand, [`Hi ${firstName},`, '', `Your password reset code is: ${code}`, caption, '', notice]),
      html: renderEmail({
        brand,
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
    const brand = await this.brand();
    const signIn = `${this.config.webAppUrl}/sign-in`;
    const notice = 'Didn\u2019t make this change? Contact your administrator immediately.';
    await this.send(to, `Your ${brand.name} password was changed`, {
      text: lines(brand, [
        `Hi ${firstName},`,
        '',
        'Your password was just changed, and your other signed-in devices were signed out.',
        '',
        notice,
        '',
        `Sign in: ${signIn}`,
      ]),
      html: renderEmail({
        brand,
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

  /**
   * Sent to a broker when an admin or colleague assigns a trip to them
   * (Batch 4 - CRM Feedback 3.1 & 3.2).
   */
  async sendTripAssignment(
    to: string,
    brokerName: string,
    tripReference: number,
    clientName: string,
    departureDate: string | null,
    tripId: string,
  ): Promise<void> {
    const brand = await this.brand();
    const tripUrl = `${this.config.webAppUrl}/dashboard/trips/${tripId}`;
    await this.send(to, `New Trip Assigned: TJ-${tripReference}`, {
      text: lines(brand, [
        `Hi ${brokerName},`,
        '',
        `You have been assigned to trip TJ-${tripReference} for client ${clientName}.`,
        ...(departureDate ? [`Departure Date: ${departureDate}`] : []),
        '',
        `View Trip: ${tripUrl}`,
      ]),
      html: renderEmail({
        brand,
        preheader: `You have been assigned to trip TJ-${tripReference}.`,
        eyebrow: 'Trip Assignment',
        heading: `Trip TJ-${tripReference} Assigned`,
        paragraphs: [
          `Hi ${brokerName},`,
          `You have been assigned to manage trip <strong>TJ-${tripReference}</strong> for client <strong>${clientName}</strong>.`,
          ...(departureDate ? [`Scheduled departure: <strong>${departureDate}</strong>.`] : []),
        ],
        button: { label: 'View Trip in Command Center', href: tripUrl },
      }),
    });
  }

  /**
   * Sent to administrators when a broker submits a trip requiring approval
   * (Batch 4 - CRM Feedback 2.1).
   */
  async sendTripApprovalNotification(
    to: string,
    adminName: string,
    brokerName: string,
    tripReference: number,
    clientName: string,
    tripId: string,
  ): Promise<void> {
    const brand = await this.brand();
    const tripUrl = `${this.config.webAppUrl}/dashboard/trips/${tripId}`;
    await this.send(to, `Trip Approval Required: TJ-${tripReference}`, {
      text: lines(brand, [
        `Hi ${adminName},`,
        '',
        `Broker ${brokerName} has submitted trip TJ-${tripReference} for client ${clientName}.`,
        'Admin review and approval is required.',
        '',
        `Review Trip: ${tripUrl}`,
      ]),
      html: renderEmail({
        brand,
        preheader: `Trip TJ-${tripReference} submitted by ${brokerName} requires approval.`,
        eyebrow: 'Approval Required',
        heading: `Trip TJ-${tripReference} Pending Approval`,
        paragraphs: [
          `Hi ${adminName},`,
          `Broker <strong>${brokerName}</strong> has submitted trip <strong>TJ-${tripReference}</strong> for client <strong>${clientName}</strong>.`,
          'Please review the flight details and approve the trip so operations can proceed.',
        ],
        button: { label: 'Review & Approve Trip', href: tripUrl },
      }),
    });
  }

  /**
   * Sent to the trip's broker when an admin approves or rejects the trip.
   */
  async sendTripApprovalDecisionNotice(
    to: string,
    brokerName: string,
    tripReference: number,
    approved: boolean,
    reason: string | null,
    tripId: string,
  ): Promise<void> {
    const brand = await this.brand();
    const tripUrl = `${this.config.webAppUrl}/dashboard/trips/${tripId}`;
    const subject = approved
      ? `Trip TJ-${tripReference} Approved`
      : `Trip TJ-${tripReference} Approval Rejected`;

    await this.send(to, subject, {
      text: lines(brand, [
        `Hi ${brokerName},`,
        '',
        approved
          ? `Your trip TJ-${tripReference} has been reviewed and approved by an administrator.`
          : `Your trip TJ-${tripReference} approval was rejected.`,
        ...(reason ? [`Reason: ${reason}`] : []),
        '',
        `View Trip: ${tripUrl}`,
      ]),
      html: renderEmail({
        brand,
        preheader: approved
          ? `Your trip TJ-${tripReference} has been approved.`
          : `Your trip TJ-${tripReference} approval was rejected.`,
        eyebrow: 'Trip Approval Status',
        heading: approved ? 'Trip Approved' : 'Approval Rejected',
        paragraphs: [
          `Hi ${brokerName},`,
          approved
            ? `Your trip <strong>TJ-${tripReference}</strong> has been reviewed and approved by an administrator.`
            : `Your trip <strong>TJ-${tripReference}</strong> approval was rejected by an administrator.`,
          ...(reason ? [`Reason: <em>${reason}</em>`] : []),
        ],
        button: { label: 'View Trip in Command Center', href: tripUrl },
      }),
    });
  }
}

/** A plain-text body from lines, signed the same way every time. */
function lines(brand: EmailBrand, body: string[]): string {
  return [...body, '', `\u2014 ${brand.name} Command Center`].join('\n');
}
