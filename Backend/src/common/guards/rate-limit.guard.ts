import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_KEY } from '../constants/auth.constants.js';
import type { RateLimitOptions } from '../decorators/rate-limit.decorator.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { AppConfigService } from '../../config/config.service.js';
import type { AuthenticatedUser } from '../types/api.types.js';

/**
 * Redis-backed fixed-window rate limiter for routes marked `@RateLimit(...)`.
 *
 * Redis-backed rather than in-memory so the limit still holds if the API is
 * ever run as more than one PM2 process on the VPS.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) return true;

    // Both knobs are pinned to their safe values in production by
    // env.validation, so this can only relax limits in development.
    const { enabled, multiplier } = this.config.rateLimit;
    if (!enabled) return true;
    const limit = options.limit * multiplier;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    // Authenticated callers are limited per account; anonymous ones per IP.
    const identity = user?.id ?? request.ip ?? 'unknown';
    const route = `${request.method}:${context.getClass().name}.${context.getHandler().name}`;
    const key = `ratelimit:${route}:${identity}`;

    const hits = await this.redis.incrementWithTtl(key, options.windowSeconds);

    if (hits > limit) {
      const retryAfter = await this.redis.ttl(key);
      throw new HttpException(
        {
          message: 'Too many requests. Please try again later.',
          retryAfter: retryAfter > 0 ? retryAfter : options.windowSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
