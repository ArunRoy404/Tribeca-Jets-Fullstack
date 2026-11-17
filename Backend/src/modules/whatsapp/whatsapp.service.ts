import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { SettingsService } from '../settings/settings.service.js';
import type { IncomingMessage } from './whatsapp.payload.js';
import { WhatsappAgent } from './whatsapp.agent.js';

/** Meta redelivers until it gets a 200; a day covers every retry it makes. */
const SEEN_TTL_SECONDS = 24 * 60 * 60;

/**
 * A message older than this is not acted on. After an outage Meta delivers
 * what queued up; "approve it" typed an hour ago, about a trip that has
 * moved on since, must not run now.
 */
export const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000;

export type Outcome =
  | 'accepted'
  | 'not_configured'
  | 'switched_off'
  | 'unknown_sender'
  | 'duplicate'
  | 'stale'
  | 'no_admin';

/**
 * The Super Admin's WhatsApp assistant.
 *
 * Every message passes the same gates, in order, before anything reads it:
 * the server is configured, Settings › Security has it switched on, it comes
 * from the one phone in the env, it has not been handled already, it is
 * recent, and the account named in the env is still an active Super Admin.
 * A message that fails any of them is dropped without a reply — an answer to
 * a stranger confirms the number is a bot worth probing.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly settings: SettingsService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly agent: WhatsappAgent,
  ) {}

  /** Runs each message through the gates; returns what became of each. */
  async receive(messages: IncomingMessage[], now = new Date()): Promise<Outcome[]> {
    const outcomes: Outcome[] = [];
    for (const message of messages) {
      const outcome = await this.gate(message, now);
      if (outcome === 'accepted') {
        // The user is re-read per message, so a suspension or a role change
        // in the web app stops the bot at once.
        const admin = await this.actingAdmin();
        if (!admin) {
          outcomes.push('no_admin');
          continue;
        }
        await this.handle(admin, message);
      }
      outcomes.push(outcome);
    }
    return outcomes;
  }

  private async gate(message: IncomingMessage, now: Date): Promise<Outcome> {
    const config = this.config.whatsapp;
    if (!config) return 'not_configured';

    if (!(await this.settings.read()).whatsappAssistantEnabled) return 'switched_off';

    if (message.from !== config.adminPhone) {
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

    return 'accepted';
  }

  /**
   * The account the bot acts as, loaded the way `JwtStrategy` loads a session
   * — live, active, and with its own permission set — and refused unless it
   * is still a Super Admin. Identity, by stored role: the owner's rule is that
   * only the Super Admin uses the bot.
   */
  async actingAdmin(): Promise<AuthenticatedUser | null> {
    const email = this.config.whatsapp?.adminEmail;
    if (!email) return null;
    return this.adminForEmail(email);
  }

  /** The terminal's optional --as uses exactly the webhook's identity query. */
  async adminForEmail(email: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' },
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: UserRole.SUPER_ADMIN,
      },
      select: { id: true, email: true, role: true, permissions: true },
    });
    if (!user) {
      this.logger.error(
        'SUPER_ADMIN_WHATSAPP_EMAIL names no active Super Admin; the WhatsApp assistant is answering nobody.',
      );
      return null;
    }
    const { permissions, ...identity } = user;
    return { ...identity, access: resolveAccess(user.role, permissions) };
  }

  /**
   * Step 2 prepares a reply; step 3 sends it. Neither the message nor the
   * reply is logged — either can carry client names and figures. The webhook
   * has already answered Meta, so a failure here must never escape.
   */
  private async handle(admin: AuthenticatedUser, message: IncomingMessage): Promise<void> {
    try {
      if (message.type !== 'text' || !message.text?.trim()) {
        this.logger.log(`Ignored non-text WhatsApp message ${message.id} (${message.type})`);
        return;
      }
      if (!this.agent.ready) {
        this.logger.warn('WhatsApp assistant accepted a message but OPENAI_API_KEY / OPENAI_MODEL are not set');
        return;
      }
      const reply = await this.agent.reply(admin, message.from, message.text);
      this.logger.log(`Prepared a reply to ${message.id} (${reply.length} chars)`);
    } catch (error: unknown) {
      this.logger.error(`WhatsApp reply preparation failed (${error instanceof Error ? error.name : 'UnknownError'})`);
    }
  }
}
