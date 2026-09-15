import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../../../common/constants/auth.constants.js';
import { AppConfigService } from '../../../config/config.service.js';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/api.types.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
}

/**
 * Reads the access token from the httpOnly cookie only.
 *
 * Deliberately no Authorization-header fallback: allowing one would reopen the
 * XSS token-theft vector the cookie approach exists to close.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.auth.accessSecret,
    } satisfies StrategyOptionsWithoutRequest);
  }

  /**
   * Re-reads the user on every request rather than trusting the token's claims.
   * A suspended or deleted account must lose access immediately, not whenever
   * its 15-minute access token happens to expire.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account is no longer active');
    }

    return user;
  }
}
