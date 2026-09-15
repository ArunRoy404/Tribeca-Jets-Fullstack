import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY } from '../constants/auth.constants.js';

export interface RateLimitOptions {
  /** Maximum requests allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/**
 * Per-route rate limiting, enforced by RateLimitGuard against Redis.
 *
 * Hand-rolled rather than using @nestjs/throttler, which does not yet declare
 * support for Nest 12.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
