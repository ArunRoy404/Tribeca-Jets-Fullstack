import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
} from '../../common/constants/auth.constants.js';
import { AppConfigService } from '../../config/config.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

export interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Owns token issuing, rotation, revocation and the cookies that carry them.
 *
 * Refresh tokens are opaque random strings stored as SHA-256 hashes — not
 * JWTs — so a database leak yields nothing usable and revocation is real
 * rather than advisory.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private baseCookieOptions(): CookieOptions {
    const { cookieDomain, cookieSecure } = this.config.auth;
    return {
      httpOnly: true,
      secure: cookieSecure,
      // Lax keeps the cookie on top-level navigations back from Gmail links
      // while blocking it on cross-site subrequests.
      sameSite: 'lax',
      domain: cookieDomain,
    };
  }

  private async issueAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.auth.accessSecret,
      // Seconds, not the raw "15m" string: @nestjs/jwt types the string form
      // as a narrow ms template literal that a config string cannot satisfy.
      expiresIn: Math.floor(parseDuration(this.config.auth.accessTtl) / 1000),
    });
  }

  private async issueRefreshToken(
    userId: string,
    context: SessionContext,
    replacesTokenId?: string,
  ): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() + parseDuration(this.config.auth.refreshTtl),
    );

    const created = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        expiresAt,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      select: { id: true },
    });

    if (replacesTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacesTokenId },
        data: { revokedAt: new Date(), replacedByTokenId: created.id },
      });
    }

    return token;
  }

  /** Issues a fresh token pair and writes all three cookies. */
  async startSession(
    res: Response,
    user: AuthenticatedUser,
    context: SessionContext,
  ): Promise<void> {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user.id, context),
    ]);

    this.writeCookies(res, accessToken, refreshToken);
  }

  /**
   * Rotates a refresh token.
   *
   * If a token that was already revoked is presented, it has been replayed —
   * which means it leaked. Every session for that user is killed rather than
   * just rejecting the one request.
   */
  async rotateSession(
    res: Response,
    presentedToken: string | undefined,
    context: SessionContext,
  ): Promise<AuthenticatedUser> {
    if (!presentedToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(presentedToken) },
      include: {
        user: { select: { id: true, email: true, role: true, status: true, deletedAt: true } },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking all sessions`,
      );
      await this.revokeAllForUser(stored.userId);
      this.clearCookies(res);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (!stored.user || stored.user.deletedAt || stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is no longer active');
    }

    const user: AuthenticatedUser = {
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user.id, context, stored.id),
    ]);

    this.writeCookies(res, accessToken, refreshToken);
    return user;
  }

  async endSession(res: Response, presentedToken?: string): Promise<void> {
    if (presentedToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hash(presentedToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearCookies(res);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private writeCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const base = this.baseCookieOptions();

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...base,
      path: '/',
      maxAge: parseDuration(this.config.auth.accessTtl),
    });

    // Scoped to the auth routes so it is not attached to every API call.
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...base,
      path: REFRESH_COOKIE_PATH,
      maxAge: parseDuration(this.config.auth.refreshTtl),
    });

    // Readable by JS on purpose — the frontend echoes it in X-CSRF-Token.
    res.cookie(CSRF_COOKIE, randomBytes(32).toString('base64url'), {
      ...base,
      httpOnly: false,
      path: '/',
      maxAge: parseDuration(this.config.auth.refreshTtl),
    });
  }

  private clearCookies(res: Response): void {
    const base = this.baseCookieOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, path: REFRESH_COOKIE_PATH });
    res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false, path: '/' });
  }
}

/** Converts `15m` / `7d` / `30s` into milliseconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${value}". Expected e.g. 15m, 7d.`);
  }
  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}
