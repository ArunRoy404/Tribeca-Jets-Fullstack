import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../../core/audit/audit.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole, UserStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { WhatsappDocument } from './whatsapp.document.js';
import type { IncomingMessage } from './whatsapp.payload.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { isConfirmationCommand, WhatsappAgent, type ActionEvent, type WhatsappReply } from './whatsapp.agent.js';
import { phoneSnapshot, recordPhoneEvent, WhatsappEvent, type PhoneSnapshot } from './whatsapp-history.events.js';
import { EARLIEST_PHONE } from './whatsapp-phone.service.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

/** Meta redelivers until it gets a 200; a day covers every retry it makes. */
const SEEN_TTL_SECONDS = 24 * 60 * 60;

/**
 * A message older than this is not acted on. After an outage Meta delivers
 * what queued up; "approve it" typed an hour ago, about a trip that has
 * moved on since, must not run now.
 */
export const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000;

export const NON_TEXT_REPLY = 'I can only read text messages for now.';
export const NOT_READY_REPLY = "The assistant isn't set up on the server yet.";
/** After the read receipt and "typing…", silence would look like a lost message. */
export const FAILED_REPLY = 'Something went wrong answering that — please try again.';

export type Outcome =
  | 'accepted'
  | 'not_configured'
  | 'switched_off'
  | 'unknown_sender'
  | 'duplicate'
  | 'stale'
  | 'no_admin';

const ADMIN_SELECT = {
  id: true, email: true, role: true, status: true, deletedAt: true,
  permissions: true, timeZone: true,
} satisfies Prisma.UserSelect;
const ACTIVE_ADMIN = { deletedAt: null, status: UserStatus.ACTIVE, role: UserRole.SUPER_ADMIN } as const;
const outgoingReceipt = z.object({
  actorId: z.string(),
  phone: z.object({ id: z.string(), label: z.string(), last4: z.string().regex(/^\d{4}$/) }),
});
const receiptKey = (messageId: string) => `whatsapp:outgoing:${messageId}`;

type WhatsappAdmin = AuthenticatedUser & { phone: string | null };
type VerifiedSender = { admin: AuthenticatedUser; phone: PhoneSnapshot };

type AdminRow = Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;

function identity(user: AdminRow): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    access: resolveAccess(user.role, user.permissions),
    ...(user.timeZone ? { timeZone: user.timeZone } : {}),
  };
}

/**
 * The Super Admin's WhatsApp assistant.
 *
 * Every message passes the same gates, in order, before anything reads it:
 * the server is configured, Settings › WhatsApp & AI has it switched on, it comes
 * from a verified phone of an active Super Admin, it has not been handled
 * already, and it is recent.
 * A message that fails any of them is dropped without a reply — an answer to
 * a stranger confirms the number is a bot worth probing.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private receiving = Promise.resolve();

  constructor(
    private readonly whatsappSettings: WhatsappSettingsService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly agent: WhatsappAgent,
    private readonly sender: WhatsappSender,
    private readonly audit: AuditService,
  ) {}

  /** Runs each message through the gates; returns what became of each. */
  receive(messages: IncomingMessage[], now = new Date()): Promise<Outcome[]> {
    // Meta can deliver a phone's messages in separate requests. Finish
    // sending one summary before a later message can change the pending slot.
    const result = this.receiving.then(() => this.receiveMessages(messages, now));
    this.receiving = result.then(() => undefined, () => undefined);
    return result;
  }

  private async receiveMessages(messages: IncomingMessage[], now: Date): Promise<Outcome[]> {
    const outcomes: Outcome[] = [];
    for (const message of messages) {
      const result = await this.gate(message, now);
      if (typeof result === 'string') {
        outcomes.push(result);
        continue;
      }
      await this.handle(result, message);
      outcomes.push('accepted');
    }
    return outcomes;
  }

  private async gate(message: IncomingMessage, now: Date): Promise<Exclude<Outcome, 'accepted'> | VerifiedSender> {
    if (!await this.whatsappSettings.current()) return 'not_configured';

    if (!await this.whatsappSettings.assistantEnabled()) return 'switched_off';

    // Re-read identity per message so a suspension, role change or unlink
    // takes effect on the next delivery.
    const linked = await this.prisma.whatsappPhone.findFirst({
      where: { phone: message.from, deletedAt: null },
      select: { id: true, label: true, phone: true, user: { select: ADMIN_SELECT } },
    });
    if (!linked) {
      // The last four digits only: enough to recognise, not a register.
      this.logger.warn(`Ignored a WhatsApp message from …${message.from.slice(-4)}`);
      return 'unknown_sender';
    }
    if (!(await this.redis.claimOnce(`whatsapp:seen:${message.id}`, SEEN_TTL_SECONDS))) {
      return 'duplicate';
    }

    if (message.sentAt && now.getTime() - message.sentAt.getTime() > MAX_MESSAGE_AGE_MS) {
      this.logger.warn(`Ignored WhatsApp message ${message.id}: sent ${message.sentAt.toISOString()}`);
      return 'stale';
    }

    const { user } = linked;
    if (user.deletedAt || user.status !== UserStatus.ACTIVE || user.role !== UserRole.SUPER_ADMIN) return 'no_admin';
    return { admin: identity(user), phone: phoneSnapshot(linked) };
  }

  /**
   * The account the bot acts as, loaded the way `JwtStrategy` loads a session
   * — live, active, and with its own permission set — and refused unless it
   * is still a Super Admin. Identity, by stored role: the owner's rule is that
   * only the Super Admin uses the bot.
   */
  async actingAdmin(): Promise<WhatsappAdmin | null> {
    const linked = await this.prisma.whatsappPhone.findFirst({
      where: { deletedAt: null, user: ACTIVE_ADMIN },
      orderBy: EARLIEST_PHONE,
      select: { phone: true, user: { select: ADMIN_SELECT } },
    });
    return linked ? { ...identity(linked.user), phone: linked.phone } : null;
  }

  /** The terminal can target an active Super Admin before a phone is linked. */
  async adminForEmail(email: string): Promise<WhatsappAdmin | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' },
        ...ACTIVE_ADMIN,
      },
      select: {
        ...ADMIN_SELECT,
        whatsappPhones: { where: { deletedAt: null }, orderBy: EARLIEST_PHONE, take: 1, select: { phone: true } },
      },
    });
    return user ? { ...identity(user), phone: user.whatsappPhones[0]?.phone ?? null } : null;
  }

  /** A positive send response can still be followed by a failed delivery receipt. */
  async recordDeliveryFailures(ids: string[]): Promise<void> {
    for (const id of ids) {
      const stored = await this.redis.takeString(receiptKey(id));
      if (!stored) continue;
      const receipt = outgoingReceipt.safeParse(JSON.parse(stored));
      if (receipt.success) {
        const { actorId, phone } = receipt.data;
        await recordPhoneEvent(this.audit, actorId, phone, WhatsappEvent.REPLY_FAILED, undefined);
      }
    }
  }

  /**
   * Sends the reply to the phone that passed the gates. Neither the message nor the
   * reply is logged — either can carry client names and figures. The webhook
   * has already answered Meta, so a failure here must never escape.
   */
  private async handle({ admin, phone }: VerifiedSender, message: IncomingMessage): Promise<void> {
    const recordAction = ({ action, details }: ActionEvent) => recordPhoneEvent(this.audit, admin.id, phone, action, details);
    // The receipt carries Meta's outgoing ID. Keep only the phone snapshot
    // and actor for recognised assistant replies, never a message or number.
    const trackDelivery = (id: string) => this.redis.setString(receiptKey(id), JSON.stringify({ actorId: admin.id, phone }), SEEN_TTL_SECONDS);
    let failed = false;
    const recordFailure = async () => {
      if (failed) return;
      failed = true;
      await recordPhoneEvent(this.audit, admin.id, phone, WhatsappEvent.REPLY_FAILED, undefined);
    };
    let documents: WhatsappDocument[] = [];
    let answer: WhatsappReply['answer'];
    try {
      await this.sender.markRead(message.id);
      let reply: string;
      if (message.type !== 'text' || !message.text?.trim()) {
        this.logger.log(`Ignored non-text WhatsApp message ${message.id} (${message.type})`);
        reply = await this.agent.cancelPending(message.from, recordAction) + NON_TEXT_REPLY;
      } else if (!isConfirmationCommand(message.text) && !await this.agent.ready()) {
        this.logger.warn('WhatsApp assistant accepted a message but the OpenAI key or model is missing from Settings');
        reply = await this.agent.cancelPending(message.from, recordAction) + NOT_READY_REPLY;
      } else {
        const response = await this.agent.reply(admin, message.from, message.text, true, recordAction);
        reply = response.text;
        documents = response.documents;
        answer = response.answer;
      }
      if (await this.sender.sendText(message.from, reply, message.id, trackDelivery)) {
        this.logger.log(`Sent a reply to ${message.id} (${reply.length} chars)`);
        if (answer && 'proposal' in answer) await recordPhoneEvent(this.audit, admin.id, phone, WhatsappEvent.ACTION_PROPOSED, answer.proposal);
        if (answer && 'tools' in answer) await recordPhoneEvent(this.audit, admin.id, phone, WhatsappEvent.QUESTION_ANSWERED, { tools: answer.tools });
      } else {
        this.logger.warn(`Reply to ${message.id} was not delivered`);
        await recordFailure();
        // Never leave a proposal confirmable if its summary could not be sent.
        await this.agent.cancelPending(message.from);
      }
    } catch (error: unknown) {
      this.logger.error(`WhatsApp reply preparation failed (${error instanceof Error ? error.name : 'UnknownError'})`);
      // sendText never throws, so nothing was sent yet and this cannot double up.
      if (!await this.sender.sendText(message.from, FAILED_REPLY, message.id, trackDelivery)) await recordFailure();
      // Nor may a proposal stay confirmable when its summary was never shown.
      await this.agent.cancelPending(message.from).catch(() => undefined);
      return;
    }
    for (const document of documents) {
      if (await this.sender.sendDocument(message.from, document, undefined, message.id, trackDelivery)) {
        if (document.history) await recordPhoneEvent(this.audit, admin.id, phone, WhatsappEvent.DOCUMENT_SENT, document.history);
      } else {
        await recordFailure();
        await this.sender.sendText(message.from, `I couldn't send ${document.filename} — please ask again.`, message.id, trackDelivery);
      }
    }
  }
}
