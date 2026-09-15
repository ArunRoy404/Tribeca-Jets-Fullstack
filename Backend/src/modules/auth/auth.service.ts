import { Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import type { LoginInput } from './dto/login.dto.js';
import type { SessionContext } from './token.service.js';

/**
 * Argon2id with parameters sized for an interactive login on a modest VPS:
 * ~64MB and 3 passes keeps verification well under 100ms while staying
 * expensive to brute force offline.
 */
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'auth.login.success',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { id: user.id, email: user.email, role: user.role };
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
