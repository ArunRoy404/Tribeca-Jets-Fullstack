import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AppConfigService } from '../../config/config.service.js';
import { VerificationPurpose } from '../../generated/prisma/enums.js';

export interface IssuedChallenge {
  /** Opaque token for the httpOnly flow cookie. */
  challengeToken: string;
  /** Plaintext code, for delivery by email only — never returned to a client. */
  code: string;
  expiresAt: Date;
}

export interface VerifiedChallenge {
  id: string;
  userId: string;
}

/**
 * Issues and verifies the 6-digit codes behind two-factor sign-in and
 * password reset.
 *
 * Both the code and the challenge token are stored hashed. The challenge token
 * lives in an httpOnly cookie, which binds a flow to one browser: the OTP
 * screens have no hidden challenge field, and a code phished onto another
 * device is unusable without that cookie.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * Cryptographically random 6-digit code.
   *
   * `randomInt` rather than `Math.random()`: this is a credential, and
   * `Math.random` is predictable from prior outputs.
   */
  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private ttlMinutesFor(purpose: VerificationPurpose): number {
    return purpose === VerificationPurpose.TWO_FACTOR
      ? this.config.verification.twoFactorTtlMinutes
      : this.config.verification.passwordResetTtlMinutes;
  }

  /**
   * Issues a code, invalidating any earlier outstanding one for the same user
   * and purpose so only the newest code is ever live — otherwise "Resend"
   * would widen the guessing surface with every click.
   */
  async issue(
    userId: string,
    purpose: VerificationPurpose,
    context: { ipAddress?: string | null; userAgent?: string | null } = {},
  ): Promise<IssuedChallenge> {
    const ttlMinutes = this.ttlMinutesFor(purpose);
    const code = this.generateCode();
    const challengeToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.prisma.$transaction([
      this.prisma.verificationCode.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.verificationCode.create({
        data: {
          userId,
          purpose,
          codeHash: this.hash(code),
          challengeHash: this.hash(challengeToken),
          expiresAt,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
      }),
    ]);

    return { challengeToken, code, expiresAt };
  }

  /**
   * Re-issues a code for an in-flight challenge, returning a fresh challenge
   * token so the caller can refresh the cookie.
   */
  async resend(
    challengeToken: string | undefined,
    purpose: VerificationPurpose,
  ): Promise<IssuedChallenge & { userId: string; email: string; firstName: string }> {
    const record = await this.loadActive(challengeToken, purpose);

    const issued = await this.issue(record.userId, purpose, {
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
    });

    return {
      ...issued,
      userId: record.userId,
      email: record.user.email,
      firstName: record.user.firstName,
    };
  }

  private async loadActive(
    challengeToken: string | undefined,
    purpose: VerificationPurpose,
  ) {
    // Same error for missing, unknown, expired and consumed: none of these
    // should tell a caller which of them happened.
    const expired = new BadRequestException(
      'This verification session has expired. Please start again.',
    );

    if (!challengeToken) throw expired;

    const record = await this.prisma.verificationCode.findUnique({
      where: { challengeHash: this.hash(challengeToken) },
      include: {
        user: { select: { id: true, email: true, firstName: true, status: true, deletedAt: true } },
      },
    });

    if (
      !record ||
      record.purpose !== purpose ||
      record.consumedAt ||
      record.expiresAt.getTime() < Date.now() ||
      !record.user ||
      record.user.deletedAt
    ) {
      throw expired;
    }

    return record;
  }

  /**
   * Checks a submitted code against an in-flight challenge.
   *
   * On success the record is consumed (two-factor) or marked verified
   * (password reset, which still needs a second step to set the password).
   */
  async verify(
    challengeToken: string | undefined,
    code: string,
    purpose: VerificationPurpose,
  ): Promise<VerifiedChallenge> {
    const record = await this.loadActive(challengeToken, purpose);
    const maxAttempts = this.config.verification.maxAttempts;

    if (record.attempts >= maxAttempts) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new BadRequestException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    if (!this.codeMatches(record.codeHash, code)) {
      const attempts = record.attempts + 1;
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts },
      });

      const remaining = maxAttempts - attempts;
      if (remaining <= 0) {
        this.logger.warn(
          `Verification code exhausted for user ${record.userId} (${purpose})`,
        );
        throw new BadRequestException(
          'Too many incorrect attempts. Please request a new code.',
        );
      }

      throw new BadRequestException(
        `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      );
    }

    if (purpose === VerificationPurpose.TWO_FACTOR) {
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
    } else {
      // Reset still needs the new password, so the record stays open but is
      // re-stamped with the shorter post-verification window.
      await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: {
          verifiedAt: new Date(),
          expiresAt: new Date(
            Date.now() +
              this.config.verification.passwordResetWindowMinutes * 60_000,
          ),
        },
      });
    }

    return { id: record.id, userId: record.userId };
  }

  /**
   * Loads a password-reset challenge that has already passed code
   * verification, for the final set-password step.
   */
  async requireVerified(
    challengeToken: string | undefined,
    purpose: VerificationPurpose,
  ): Promise<VerifiedChallenge> {
    const record = await this.loadActive(challengeToken, purpose);

    if (!record.verifiedAt) {
      throw new BadRequestException(
        'This verification session has expired. Please start again.',
      );
    }

    return { id: record.id, userId: record.userId };
  }

  async consume(id: string): Promise<void> {
    await this.prisma.verificationCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  /** Constant-time comparison; a timing oracle would leak the code digit by digit. */
  private codeMatches(storedHash: string, submitted: string): boolean {
    const a = Buffer.from(storedHash);
    const b = Buffer.from(this.hash(submitted));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
