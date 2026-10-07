import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_COOKIE,
  MODULES_COOKIE,
  PASSWORD_RESET_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  TWO_FACTOR_COOKIE,
} from '../../common/constants/auth.constants.js';
import { AppConfigService } from '../../config/config.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { resolveAccess, type AccessMap } from '../../common/authorization/access.js';
import { UserRole } from '../../generated/prisma/enums.js';

/** First entry of `tj_modules` for a partner: their area is the portal. */
const PORTAL_MARKER = 'PORTAL';

/**
 * The real role, never `actsAs`: which half of the app a person uses is not
 * a permission, so the temporary everyone-is-owner switch does not move it.
 */
const isPartner = (role: UserRole) => role === UserRole.REFERRAL_AGENT;
import type { JwtPayload } from './strategies/jwt.strategy.js';

export interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Which flow cookie a challenge belongs to. */
export type ChallengeKind = 'twoFactor' | 'passwordReset';

const CHALLENGE_COOKIES: Record<ChallengeKind, string> = {
  twoFactor: TWO_FACTOR_COOKIE,
  passwordReset: PASSWORD_RESET_COOKIE,
};

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

  private refreshTtlMs(rememberMe: boolean): number {
    return parseDuration(
      rememberMe
        ? this.config.auth.refreshTtlRemembered
        : this.config.auth.refreshTtl,
    );
  }

  private async issueRefreshToken(
    userId: string,
    context: SessionContext,
    rememberMe: boolean,
    replaces?: { id: string; sessionStartedAt: Date },
  ): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlMs(rememberMe));

    const created = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        expiresAt,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        // A rotation continues the same sign-in, so it inherits its start.
        ...(replaces ? { sessionStartedAt: replaces.sessionStartedAt } : {}),
      },
      select: { id: true },
    });

    if (replaces) {
      await this.prisma.refreshToken.update({
        where: { id: replaces.id },
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
    rememberMe = false,
  ): Promise<void> {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user.id, context, rememberMe),
    ]);

    this.writeCookies(res, accessToken, refreshToken, rememberMe);
    await this.writeModulesFor(res, user.id);
    // The sign-in flow is over; drop any challenge cookie still hanging around.
    this.clearChallenge(res, 'twoFactor');
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

    if (this.hasBeenIdle(stored.createdAt)) {
      this.logger.warn(
        `Refusing a refresh for user ${stored.userId}: session idle past the limit`,
      );
      // Only this device's session. Idleness is a fact about one browser —
      // a phone left on a desk must not sign out the laptop in use. (Reuse,
      // above, revokes everything: that one is a theft signal.)
      await this.revokeSession(stored.id);
      this.clearCookies(res);
      throw new UnauthorizedException(
        'Signed out after a period of inactivity. Please sign in again.',
      );
    }

    if (!stored.user || stored.user.deletedAt || stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is no longer active');
    }

    const user: AuthenticatedUser = {
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    };

    // Preserve the original session length across rotation, so "Remember me"
    // is not silently downgraded on the first refresh.
    const rememberMe =
      stored.expiresAt.getTime() - stored.createdAt.getTime() >
      parseDuration(this.config.auth.refreshTtl) * 1.5;

    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user.id, context, rememberMe, {
        id: stored.id,
        sessionStartedAt: stored.sessionStartedAt,
      }),
    ]);

    this.writeCookies(res, accessToken, refreshToken, rememberMe);
    await this.writeModulesFor(res, user.id);
    return user;
  }

  /**
   * The routing hint `proxy.js` reads: the modules this person may view.
   * Rewritten on sign-in, on every refresh and on every `/auth/me`, so a
   * change an administrator makes reaches the proxy within one of those.
   */
  writeModulesCookie(res: Response, access: AccessMap, role: UserRole): void {
    // A partner works in the portal, never the CRM; the marker lets the proxy
    // send them there before a CRM page renders.
    const entries = [...(isPartner(role) ? [PORTAL_MARKER] : []), ...Object.keys(access)];
    res.cookie(MODULES_COOKIE, entries.join('.'), {
      ...this.baseCookieOptions(),
      path: '/',
      maxAge: this.refreshTtlMs(true),
    });
  }

  private async writeModulesFor(res: Response, userId: string): Promise<void> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, permissions: true },
    });
    if (row) this.writeModulesCookie(res, resolveAccess(row.role, row.permissions), row.role);
  }

  /**
   * Whether this session has demonstrably sat untouched past the idle limit.
   *
   * The browser owns the real timer — only it can tell whether a person is
   * there, and it signs out precisely (client request #4). This is the
   * backstop, so switching that timer off does not buy an endless session.
   *
   * The signal is the age of the refresh token row. A rotation only happens
   * once the access token has expired, so a session in continuous use presents
   * a row at most `accessTtl` old, while an abandoned one keeps ageing. The
   * threshold is therefore `accessTtl + idleTimeout`: anything older cannot be
   * explained by a user who has been active within the limit.
   *
   * That makes it deliberately **approximate, and always in the user's
   * favour** — it never signs out someone who was active, and it tolerates up
   * to one access-token lifetime of extra idleness before it acts. Enforcing
   * it to the second would mean writing a timestamp on every authenticated
   * request, which is a write per request to save a few minutes at the tail of
   * an already-expired session.
   */
  private hasBeenIdle(issuedAt: Date): boolean {
    const limit =
      parseDuration(this.config.auth.accessTtl) +
      this.config.auth.idleTimeoutMinutes * 60_000;
    return Date.now() - issuedAt.getTime() > limit;
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

  private async revokeSession(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * The `where` for a session that can still be used: not revoked, not
   * expired, and renewed recently enough that the idle rule would still let
   * it refresh. A browser closed an hour ago holds a token nobody revoked,
   * but it is not signed in any more and must not be listed as if it were.
   */
  private liveSessionWhere(userId: string) {
    const idleLimitMs =
      parseDuration(this.config.auth.accessTtl) + this.config.auth.idleTimeoutMinutes * 60_000;
    return {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - idleLimitMs) },
    };
  }

  /** The row behind the refresh cookie this request carried, if it is live. */
  async currentSessionId(userId: string, presentedToken?: string): Promise<string | null> {
    if (!presentedToken) return null;
    const row = await this.prisma.refreshToken.findFirst({
      where: { ...this.liveSessionWhere(userId), tokenHash: this.hash(presentedToken) },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /** One page of the user's signed-in devices, most recently active first. */
  async listSessions(userId: string, skip: number, take: number) {
    const where = this.liveSessionWhere(userId);
    const [rows, total] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          sessionStartedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.refreshToken.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * Ends one of the user's own sessions. False when the id is not one of
   * their live sessions, which the caller answers with a 404 — a session id
   * belonging to someone else is not confirmed to exist.
   */
  async revokeOwnSession(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { ...this.liveSessionWhere(userId), id },
      data: { revokedAt: new Date() },
    });
    return count > 0;
  }

  /** Every session but the one making the request. Returns how many ended. */
  async revokeOtherSessions(userId: string, keepId: string | null): Promise<number> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(keepId ? { id: { not: keepId } } : {}) },
      data: { revokedAt: new Date() },
    });
    return count;
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
    rememberMe: boolean,
  ): void {
    const base = this.baseCookieOptions();
    const refreshMaxAge = this.refreshTtlMs(rememberMe);

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...base,
      path: '/',
      maxAge: parseDuration(this.config.auth.accessTtl),
    });

    // Scoped to the auth routes so it is not attached to every API call.
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...base,
      path: REFRESH_COOKIE_PATH,
      maxAge: refreshMaxAge,
    });

    // Readable by JS on purpose — the frontend echoes it in X-CSRF-Token.
    res.cookie(CSRF_COOKIE, randomBytes(32).toString('base64url'), {
      ...base,
      httpOnly: false,
      path: '/',
      maxAge: refreshMaxAge,
    });
  }

  /**
   * Stores an in-flight challenge token. httpOnly, short-lived and scoped to
   * the auth routes: it authorises a step in a flow, not a session.
   */
  setChallenge(
    res: Response,
    kind: ChallengeKind,
    token: string,
    ttlMs: number,
  ): void {
    res.cookie(CHALLENGE_COOKIES[kind], token, {
      ...this.baseCookieOptions(),
      path: REFRESH_COOKIE_PATH,
      maxAge: ttlMs,
    });
  }

  clearChallenge(res: Response, kind: ChallengeKind): void {
    res.clearCookie(CHALLENGE_COOKIES[kind], {
      ...this.baseCookieOptions(),
      path: REFRESH_COOKIE_PATH,
    });
  }

  private clearCookies(res: Response): void {
    const base = this.baseCookieOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, path: REFRESH_COOKIE_PATH });
    res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false, path: '/' });
    res.clearCookie(MODULES_COOKIE, { ...base, path: '/' });
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
