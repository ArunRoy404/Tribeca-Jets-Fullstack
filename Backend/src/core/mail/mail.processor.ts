import { Inject, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { EmailMessageStatus } from '../../generated/prisma/enums.js';
import { MAIL_DRIVER, type MailDriver } from './mail.interface.js';
import { MAIL_QUEUE, type MailJob, isPermanentMailFailure } from './mail.queue.js';

/**
 * The background sender. Pulls a job, hands it to the mail driver, and — for
 * a composed message — records what really happened on its `EmailMessage`
 * row and on the timelines of the records it was about.
 *
 * `SENT` still means a mail server accepted it, exactly as before the queue:
 * the row says QUEUED until the worker knows.
 */
@Processor(MAIL_QUEUE, { concurrency: 5 })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    @Inject(MAIL_DRIVER) private readonly driver: MailDriver,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<MailJob>): Promise<void> {
    const { message, emailMessageId } = job.data;
    try {
      await this.driver.send(message);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // A refusal will be refused again; fail now rather than in two minutes.
      if (isPermanentMailFailure(error)) throw new UnrecoverableError(reason);
      throw error;
    }

    if (emailMessageId) {
      const status = this.driver.name === 'smtp' ? EmailMessageStatus.SENT : EmailMessageStatus.LOGGED;
      await this.settle(emailMessageId, status, null);
    }
  }

  /** Only the last attempt is a failure; earlier ones are retries. */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<MailJob> | undefined, error: Error): Promise<void> {
    if (!job) return;
    const final = error instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!final) {
      this.logger.warn(
        `Email "${job.data.message.subject}" to ${job.data.message.to} failed (attempt ${job.attemptsMade}); retrying: ${error.message}`,
      );
      return;
    }
    this.logger.error(
      `Email "${job.data.message.subject}" to ${job.data.message.to} was not delivered: ${error.message}`,
    );
    if (job.data.emailMessageId) {
      await this.settle(job.data.emailMessageId, EmailMessageStatus.FAILED, error.message);
    }
  }

  /**
   * Writes the outcome on the row and puts it on the timeline of each record
   * it was about — the client's or operator's, and the trip's — with the
   * broker who sent it as the actor.
   */
  private async settle(id: string, status: EmailMessageStatus, error: string | null): Promise<void> {
    const row = await this.prisma.emailMessage.update({
      where: { id },
      data: { status, error },
      select: {
        id: true,
        subject: true,
        toEmail: true,
        toName: true,
        clientId: true,
        operatorId: true,
        tripId: true,
        createdById: true,
        template: { select: { name: true } },
      },
    });

    const metadata = {
      emailId: row.id,
      subject: row.subject,
      to: row.toEmail,
      toName: row.toName,
      status,
      template: row.template?.name ?? null,
    };
    const action = status === EmailMessageStatus.FAILED ? 'email.failed' : 'email.sent';
    const subjects = [
      ...(row.clientId ? [{ entityType: 'Client', entityId: row.clientId }] : []),
      ...(row.operatorId ? [{ entityType: 'Operator', entityId: row.operatorId }] : []),
      ...(row.tripId ? [{ entityType: 'Trip', entityId: row.tripId }] : []),
    ];
    for (const subject of subjects) {
      await this.audit.record({ actorId: row.createdById, action, ...subject, metadata });
    }
  }
}
