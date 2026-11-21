import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { archiveData, restoreData } from '../../common/database/archive.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { phoneDigits } from '../../common/phone/phone.js';
import { paginate } from '../../common/types/api.types.js';
import { AppConfigService } from '../../config/config.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole, UserStatus, VerificationPurpose } from '../../generated/prisma/enums.js';
import { AuthService } from '../auth/auth.service.js';
import type { SessionContext } from '../auth/token.service.js';
import { VerificationService } from '../auth/verification.service.js';
import { MAX_WHATSAPP_PHONES, whatsappPhoneLabel, type QueryWhatsappPhonesDto, type VerifyWhatsappPhoneDto } from './dto/whatsapp-settings.dto.js';
import { phoneSnapshot, recordPhoneEvent, WhatsappEvent } from './whatsapp-history.events.js';
import { WhatsappMemory } from './whatsapp.memory.js';
import { WhatsappPending } from './whatsapp.pending.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

const purpose = VerificationPurpose.WHATSAPP_LINK;
const live = { deletedAt: null } as const;
const linkedElsewhere = () => new ConflictException('This WhatsApp number is already linked to another user.');
const phoneMissing = () => new NotFoundException('WhatsApp phone not found');
const PHONE_SELECT = {
  id: true, phone: true, label: true, verifiedAt: true, deletedAt: true,
} satisfies Prisma.WhatsappPhoneSelect;

export const EARLIEST_PHONE = [{ verifiedAt: 'asc' }, { id: 'asc' }] satisfies Prisma.WhatsappPhoneOrderByWithRelationInput[];

function phoneView(row: Prisma.WhatsappPhoneGetPayload<{ select: typeof PHONE_SELECT }>) {
  return { ...phoneSnapshot(row), verifiedAt: row.verifiedAt, deletedAt: row.deletedAt };
}

@Injectable()
export class WhatsappPhoneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly verification: VerificationService,
    private readonly settings: WhatsappSettingsService,
    private readonly config: AppConfigService,
    private readonly sender: WhatsappSender,
    private readonly audit: AuditService,
    private readonly pending: WhatsappPending,
    private readonly memory: WhatsappMemory,
  ) {}

  async list(userId: string, query: QueryWhatsappPhonesDto) {
    const where = { userId, ...(query.includeArchived ? {} : live) };
    const [rows, total] = await Promise.all([
      this.prisma.whatsappPhone.findMany({
        where, orderBy: EARLIEST_PHONE, select: PHONE_SELECT, ...toPrismaPagination(query),
      }),
      this.prisma.whatsappPhone.count({ where }),
    ]);
    return paginate(rows.map(phoneView), total, query.page, query.limit);
  }

  private async assertLabelAvailable(db: Prisma.TransactionClient, userId: string, label: string, exceptId?: string) {
    const row = await db.whatsappPhone.findFirst({
      where: { userId, ...live, label: { equals: label, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (row) throw new ConflictException(`You already have a phone called ${label}.`);
  }

  private async assertCanLink(db: Prisma.TransactionClient, userId: string, phone: string, label: string) {
    if (await db.whatsappPhone.count({ where: { userId, ...live } }) >= MAX_WHATSAPP_PHONES) {
      throw new ConflictException('You can link up to five phones. Unlink one first.');
    }
    const row = await db.whatsappPhone.findFirst({ where: { phone, ...live }, select: { userId: true } });
    if (row && row.userId !== userId) throw linkedElsewhere();
    if (row) throw new ConflictException('This phone is already linked');
    await this.assertLabelAvailable(db, userId, label);
  }

  async sendCode(userId: string, input: { phone: string; label?: unknown; currentPassword: string }, context: SessionContext) {
    await this.auth.assertPassword(userId, input.currentPassword);
    const name = whatsappPhoneLabel.safeParse(input.label);
    if (!name.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: { label: name.error.issues[0].message } });
    }
    const phone = phoneDigits(input.phone);
    await this.assertCanLink(this.prisma, userId, phone, name.data);
    if (!await this.settings.current()) throw new BadRequestException('Finish the Meta settings first');
    // Not counted by the code-send limit (developer's decision, 21 Nov 2026): the
    // current password is re-checked above and only the Super Admin reaches here.

    const { challengeToken, code, expiresAt } = await this.verification.issue(userId, purpose, { ...context, target: phone });
    const ttl = this.config.verification.twoFactorTtlMinutes;
    if (!await this.sender.sendText(phone, `Your Tribeca Jets code is ${code}. Enter it in Settings › WhatsApp & AI, not in this chat. It expires in ${ttl} minutes.`)) {
      await this.verification.cancel(challengeToken, purpose);
      throw new BadGatewayException(
        'WhatsApp did not accept the message — check the Meta settings and that this number can receive messages from the business number',
      );
    }
    await this.audit.record({
      actorId: userId, action: 'user.whatsapp_link_code_sent', entityType: 'User', entityId: userId,
      metadata: { fields: ['target'] }, ...context,
    });
    return { challengeToken, ttlMs: Math.max(0, expiresAt.getTime() - Date.now()) };
  }

  async verify(userId: string, challengeToken: string | undefined, { code, label }: VerifyWhatsappPhoneDto, context: SessionContext) {
    const { target } = await this.verification.verify(challengeToken, code, purpose, userId);
    if (!target) throw new BadRequestException('Request a new WhatsApp link code.');
    const linked = await this.serialisePhoneWrite(async (db) => {
      const user = await db.user.findFirst({
        where: { id: userId, ...live, status: UserStatus.ACTIVE, role: UserRole.SUPER_ADMIN },
        select: { id: true },
      });
      if (!user) throw phoneMissing();
      await this.assertCanLink(db, userId, target, label);
      const verifiedAt = new Date();
      const values = { label, verifiedAt, updatedById: userId };
      return db.whatsappPhone.upsert({
        where: { userId_phone: { userId, phone: target } },
        create: { userId, phone: target, createdById: userId, ...values },
        update: { ...values, ...restoreData(userId) },
        select: PHONE_SELECT,
      });
    }, { userId, phone: target, label });
    await recordPhoneEvent(this.audit, userId, phoneSnapshot(linked), WhatsappEvent.PHONE_LINKED, undefined, context);
    return phoneView(linked);
  }

  async unlink(userId: string, id: string, currentPassword: string, context: SessionContext) {
    await this.auth.assertPassword(userId, currentPassword);
    const row = await this.prisma.$transaction(async (db) => {
      const archived = await this.updateLive(db, userId, id, archiveData(userId));
      await db.verificationCode.updateMany({
        where: { userId, purpose, target: archived.phone, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await Promise.all([this.pending.take(archived.phone), this.memory.reset(archived.phone)]);
      return archived;
    });
    await recordPhoneEvent(this.audit, userId, phoneSnapshot(row), WhatsappEvent.PHONE_UNLINKED, { phoneId: row.id }, context);
    return phoneView(row);
  }

  async rename(userId: string, id: string, label: string, context: SessionContext) {
    const row = await this.serialisePhoneWrite(async (db) => {
      const current = await db.whatsappPhone.findFirst({ where: { id, userId, ...live }, select: PHONE_SELECT });
      if (!current) throw phoneMissing();
      if (current.label === label) return { phone: current, changed: false };
      await this.assertLabelAvailable(db, userId, label, id);
      return { phone: await this.updateLive(db, userId, id, { label, updatedById: userId }), changed: true };
    });
    if (row.changed) await recordPhoneEvent(this.audit, userId, phoneSnapshot(row.phone), WhatsappEvent.PHONE_RENAMED, undefined, context);
    return phoneView(row.phone);
  }

  private async updateLive(db: Prisma.TransactionClient, userId: string, id: string, data: Prisma.WhatsappPhoneUncheckedUpdateInput) {
    try {
      return await db.whatsappPhone.update({ where: { id, userId, ...live }, data, select: PHONE_SELECT });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw phoneMissing();
      throw error;
    }
  }

  // Serializable reads protect the per-user cap and names if writes race.
  private async serialisePhoneWrite<T>(write: (db: Prisma.TransactionClient) => Promise<T>, link?: { userId: string; phone: string; label: string }): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(write, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
        if (link && error.code === 'P2002') {
          await this.assertCanLink(this.prisma, link.userId, link.phone, link.label);
          throw linkedElsewhere();
        }
        if (error.code !== 'P2034') throw error;
      }
    }
    throw new ConflictException('Phone links changed. Please try again.');
  }
}
