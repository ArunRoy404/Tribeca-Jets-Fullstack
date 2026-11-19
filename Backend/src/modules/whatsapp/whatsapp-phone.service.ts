import { BadGatewayException, BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { phoneDigits } from '../../common/phone/phone.js';
import { AppConfigService } from '../../config/config.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole, UserStatus, VerificationPurpose } from '../../generated/prisma/enums.js';
import { AuthService } from '../auth/auth.service.js';
import { SignInThrottleService } from '../auth/sign-in-throttle.service.js';
import type { SessionContext } from '../auth/token.service.js';
import { VerificationService } from '../auth/verification.service.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

const purpose = VerificationPurpose.WHATSAPP_LINK;
const linkedElsewhere = () => new ConflictException('This WhatsApp number is already linked to another user.');

@Injectable()
export class WhatsappPhoneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly verification: VerificationService,
    private readonly throttle: SignInThrottleService,
    private readonly settings: WhatsappSettingsService,
    private readonly config: AppConfigService,
    private readonly sender: WhatsappSender,
    private readonly audit: AuditService,
  ) {}

  private async assertAvailable(userId: string, phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { whatsappPhone: phone },
      select: { id: true },
    });
    if (user && user.id !== userId) throw linkedElsewhere();
  }

  async sendCode(userId: string, input: { phone: string; currentPassword: string }, context: SessionContext) {
    await this.auth.assertPassword(userId, input.currentPassword);
    const phone = phoneDigits(input.phone);
    await this.assertAvailable(userId, phone);
    if (!await this.settings.current()) throw new BadRequestException('Finish the Meta settings first');
    await this.throttle.assertMaySendCode(phone);

    const { challengeToken, code, expiresAt } = await this.verification.issue(userId, purpose, { ...context, target: phone });
    const ttl = this.config.verification.twoFactorTtlMinutes;
    if (!await this.sender.sendText(phone, `Your Tribeca Jets code is ${code}. Enter it in Settings › WhatsApp & AI, not in this chat. It expires in ${ttl} minutes.`)) {
      await this.verification.cancel(challengeToken, purpose);
      throw new BadGatewayException(
        'WhatsApp did not accept the message — check the Meta settings and that this number can receive messages from the business number',
      );
    }
    await this.audit.record({
      actorId: userId,
      action: 'user.whatsapp_link_code_sent',
      entityType: 'User',
      entityId: userId,
      metadata: { fields: ['target'] },
      ...context,
    });
    return { challengeToken, ttlMs: Math.max(0, expiresAt.getTime() - Date.now()) };
  }

  async verify(userId: string, challengeToken: string | undefined, code: string, context: SessionContext) {
    const { target } = await this.verification.verify(challengeToken, code, purpose, userId);
    if (!target) throw new BadRequestException('Request a new WhatsApp link code.');
    await this.assertAvailable(userId, target);
    const now = new Date();
    try {
      await this.prisma.user.update({
        where: { id: userId, deletedAt: null, status: UserStatus.ACTIVE, role: UserRole.SUPER_ADMIN },
        data: { whatsappPhone: target, whatsappPhoneVerifiedAt: now, updatedById: userId },
        select: { id: true },
      });
    } catch (error) {
      // The unique index is the final check if two requests race.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw linkedElsewhere();
      throw error;
    }
    await this.audit.record({
      actorId: userId,
      action: 'user.whatsapp_linked',
      entityType: 'User',
      entityId: userId,
      metadata: { last4: target.slice(-4) },
      ...context,
    });
    return { phone: target, verifiedAt: now };
  }

  async unlink(userId: string, currentPassword: string, context: SessionContext) {
    await this.auth.assertPassword(userId, currentPassword);
    await this.prisma.$transaction([
      this.prisma.verificationCode.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId, deletedAt: null, status: UserStatus.ACTIVE, role: UserRole.SUPER_ADMIN },
        data: { whatsappPhone: null, whatsappPhoneVerifiedAt: null, updatedById: userId },
        select: { id: true },
      }),
    ]);
    await this.audit.record({
      actorId: userId,
      action: 'user.whatsapp_unlinked',
      entityType: 'User',
      entityId: userId,
      metadata: { fields: ['whatsappPhone', 'whatsappPhoneVerifiedAt'] },
      ...context,
    });
  }
}
