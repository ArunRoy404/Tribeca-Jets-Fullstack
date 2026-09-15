import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { MailService } from '../../core/mail/mail.service.js';
import { AppConfigService } from '../../config/config.service.js';
import { VerificationPurpose } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import type { LoginInput } from './dto/login.dto.js';
import type { SessionContext } from './token.service.js';
import { VerificationService } from './verification.service.js';

/**
 * Argon2id with parameters sized for an interactive login on a modest VPS:
 * ~64MB and 3 passes keeps verification well under 100ms while staying
 * expensive to brute force offline.
 */
/**
 * Returned alongside a challenge when no SMTP is configured, so the flow is
 * usable from Postman or a browser before the client provides a mail account.
 */
export interface DevCodeHint {
  code: string | null;
  notice: string;
}

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly verification: VerificationService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Surfaces the one-time code in the API response, but only when email is not
   * actually being delivered.
   *
   * Two independent conditions must both hold: the app is not in production,
   * AND the mail driver is the log driver. Production additionally refuses to
   * boot without SMTP (see MailModule), so there is no configuration in which
   * a real deployment can reach this.
   */
  private devHint(code: string | null): DevCodeHint | undefined {
    if (this.config.isProduction || this.mail.driverName !== 'log') {
      return undefined;
    }

    return {
      code,
      notice: code
        ? 'SMTP is not configured, so no email was sent. This code is included ' +
          'in the response for development only and never appears once SMTP is set.'
        : 'SMTP is not configured. No code was generated because no account ' +
          'matches that email address.',
    };
  }

  static hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON_OPTIONS);
  }

  /**
   * Verifies credentials.
   *
   * Returns the same error for "no such user" and "wrong password" so the
   * endpoint cannot be used to enumerate which emails have accounts.
   */
  async validateCredentials(
    input: LoginInput,
    context: SessionContext,
  ): Promise<AuthenticatedUser & { firstName: string; twoFactorEnabled: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        status: true,
        passwordHash: true,
        twoFactorEnabled: true,
      },
    });

    const invalid = new UnauthorizedException('Invalid email or password');
    if (!user) {
      // Burn comparable time so a missing account is not detectably faster.
      await argon2.hash(input.password, ARGON_OPTIONS);
      throw invalid;
    }

    const passwordMatches = await argon2.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      await this.audit.record({
        actorId: user.id,
        action: 'auth.login.failed',
        entityType: 'User',
        entityId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw invalid;
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        user.status === 'SUSPENDED'
          ? 'This account has been suspended'
          : 'This account has not been activated yet',
      );
    }

    // lastLoginAt is stamped once the session actually exists — for a
    // two-factor account that is after the code is verified, not here.
    if (!user.twoFactorEnabled) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    await this.audit.record({
      actorId: user.id,
      action: 'auth.login.success',
      entityType: 'User',
      entityId: user.id,
      metadata: { twoFactorRequired: user.twoFactorEnabled },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }


  // ---------------------------------------------------------------------------
  // Two-factor sign-in
  // ---------------------------------------------------------------------------

  /**
   * Starts a two-factor challenge: issues a code, emails it, and returns the
   * challenge token for the flow cookie.
   *
   * No session cookies are written until the code is verified — a correct
   * password alone must not produce a usable session.
   */
  async startTwoFactorChallenge(
    user: { id: string; email: string; firstName: string },
    context: SessionContext,
  ): Promise<{
    challengeToken: string;
    ttlMs: number;
    maskedEmail: string;
    devCode?: DevCodeHint;
  }> {
    const { challengeToken, code } = await this.verification.issue(
      user.id,
      VerificationPurpose.TWO_FACTOR,
      context,
    );

    const ttlMinutes = this.config.verification.twoFactorTtlMinutes;
    await this.mail.sendTwoFactorCode(user.email, user.firstName, code, ttlMinutes);

    await this.audit.record({
      actorId: user.id,
      action: 'auth.two_factor.challenged',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      challengeToken,
      ttlMs: ttlMinutes * 60_000,
      maskedEmail: maskEmail(user.email),
      devCode: this.devHint(code),
    };
  }

  async verifyTwoFactor(
    challengeToken: string | undefined,
    code: string,
    context: SessionContext,
  ): Promise<AuthenticatedUser> {
    const { userId } = await this.verification.verify(
      challengeToken,
      code,
      VerificationPurpose.TWO_FACTOR,
    );

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account is no longer active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'auth.two_factor.verified',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return user;
  }

  async resendTwoFactorCode(
    challengeToken: string | undefined,
  ): Promise<{
    challengeToken: string;
    ttlMs: number;
    maskedEmail: string;
    devCode?: DevCodeHint;
  }> {
    const resent = await this.verification.resend(
      challengeToken,
      VerificationPurpose.TWO_FACTOR,
    );

    const ttlMinutes = this.config.verification.twoFactorTtlMinutes;
    await this.mail.sendTwoFactorCode(
      resent.email,
      resent.firstName,
      resent.code,
      ttlMinutes,
    );

    return {
      challengeToken: resent.challengeToken,
      ttlMs: ttlMinutes * 60_000,
      maskedEmail: maskEmail(resent.email),
      devCode: this.devHint(resent.code),
    };
  }

  // ---------------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------------

  /**
   * Begins a password reset.
   *
   * Always reports success and always returns a challenge cookie, whether or
   * not the address belongs to an account. Skipping the cookie for unknown
   * addresses would make this endpoint an account-enumeration oracle just as
   * surely as a different status code would.
   */
  async startPasswordReset(
    email: string,
    context: SessionContext,
  ): Promise<{
    challengeToken: string;
    ttlMs: number;
    maskedEmail: string;
    devCode?: DevCodeHint;
  }> {
    const ttlMinutes = this.config.verification.passwordResetTtlMinutes;
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true, firstName: true, status: true },
    });

    if (!user || user.status === 'SUSPENDED') {
      this.logger.warn(`Password reset requested for unknown address: ${email}`);
      // Decoy challenge: indistinguishable from the real thing to the caller,
      // and resolves to no record, so verification fails generically.
      return {
        challengeToken: randomBytes(32).toString('base64url'),
        ttlMs: ttlMinutes * 60_000,
        maskedEmail: maskEmail(email),
        devCode: this.devHint(null),
      };
    }

    const { challengeToken, code } = await this.verification.issue(
      user.id,
      VerificationPurpose.PASSWORD_RESET,
      context,
    );

    await this.mail.sendPasswordResetCode(
      user.email,
      user.firstName,
      code,
      ttlMinutes,
    );

    await this.audit.record({
      actorId: user.id,
      action: 'auth.password_reset.requested',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      challengeToken,
      ttlMs: ttlMinutes * 60_000,
      maskedEmail: maskEmail(user.email),
      devCode: this.devHint(code),
    };
  }

  /** Verifies the reset code. The password itself is set in a second step. */
  async verifyPasswordResetCode(
    challengeToken: string | undefined,
    code: string,
  ): Promise<{ ttlMs: number }> {
    await this.verification.verify(
      challengeToken,
      code,
      VerificationPurpose.PASSWORD_RESET,
    );

    return {
      ttlMs: this.config.verification.passwordResetWindowMinutes * 60_000,
    };
  }

  async resendPasswordResetCode(
    challengeToken: string | undefined,
  ): Promise<{
    challengeToken: string;
    ttlMs: number;
    maskedEmail: string;
    devCode?: DevCodeHint;
  }> {
    const resent = await this.verification.resend(
      challengeToken,
      VerificationPurpose.PASSWORD_RESET,
    );

    const ttlMinutes = this.config.verification.passwordResetTtlMinutes;
    await this.mail.sendPasswordResetCode(
      resent.email,
      resent.firstName,
      resent.code,
      ttlMinutes,
    );

    return {
      challengeToken: resent.challengeToken,
      ttlMs: ttlMinutes * 60_000,
      maskedEmail: maskEmail(resent.email),
      devCode: this.devHint(resent.code),
    };
  }

  /**
   * Completes the reset.
   *
   * Every existing session is revoked: if the reset was triggered because the
   * account was compromised, leaving the attacker's session alive would defeat
   * the entire exercise.
   */
  async completePasswordReset(
    challengeToken: string | undefined,
    newPassword: string,
    context: SessionContext,
  ): Promise<void> {
    const { id, userId } = await this.verification.requireVerified(
      challengeToken,
      VerificationPurpose.PASSWORD_RESET,
    );

    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, passwordHash: true },
    });

    if (await argon2.verify(user.passwordHash, newPassword)) {
      throw new BadRequestException(
        'Your new password must be different from your current password',
      );
    }

    const passwordHash = await AuthService.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.verificationCode.update({
        where: { id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await this.mail.sendPasswordChangedNotice(user.email, user.firstName);

    await this.audit.record({
      actorId: userId,
      action: 'auth.password_reset.completed',
      entityType: 'User',
      entityId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  /**
   * The profile behind `GET /auth/me`.
   *
   * With httpOnly cookies the frontend cannot decode a token to learn who is
   * signed in, so this endpoint is how the app bootstraps its session state.
   */
  async getProfile(userId: string) {
    return this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        avatarKey: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }
}

/**
 * `jordan@tribecajets.com` -> `jo****@tribecajets.com`.
 *
 * Lets the UI confirm which address was used without printing it in full to
 * whoever is holding the screen.
 */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '****';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}
