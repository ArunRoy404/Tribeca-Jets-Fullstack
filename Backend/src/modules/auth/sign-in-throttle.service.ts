import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../../core/redis/redis.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  codesMessage,
  pausedMessage,
  subjectKey,
  type SignInSubject,
} from './sign-in-throttle.js';

const tooMany = (message: string, retryAfter: number) =>
  new HttpException({ message, retryAfter }, HttpStatus.TOO_MANY_REQUESTS);

/** The 429 for a sign-in that is paused, saying how long for. */
export const pausedError = (seconds: number) => tooMany(pausedMessage(seconds), seconds);

/** What one failure did: the attempts left, and the pause it started, if any. */
export interface FailureOutcome {
  /** Null under "Never". */
  remaining: number | null;
  /** Seconds of pause this failure started; null when it did not reach the limit. */
  pausedFor: number | null;
  lockoutMinutes: number;
}

/**
 * Settings › Rate Limiting, enforced (owner's decision, 15 Oct 2026).
 *
 * Replaces the per-route `@RateLimit` counters on sign-in, which counted
 * every request: five correct sign-ins in fifteen minutes from one office
 * paused the sixth person. Here only a wrong password adds to the count, a
 * correct one clears it, and the company sets the numbers. Redis-backed for
 * the same reason the guard is — a second API process shares the count.
 *
 * Read the settings when deciding, never at boot, so a change on the screen
 * applies to the next attempt.
 */
@Injectable()
export class SignInThrottleService {
  constructor(
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
  ) {}

  /** The count for a sign-in, under the company's chosen scope. */
  async signInKey(subject: SignInSubject): Promise<string> {
    return `signin:${subjectKey((await this.settings.read()).failedSignInScope, subject)}`;
  }

  /**
   * The count for a password re-check on My Account (change password,
   * two-factor on or off) — the same policy, per account, kept apart from
   * sign-in so a typo there never pauses the person's next sign-in.
   */
  reauthKey(userId: string): string {
    return `reauth:${userId}`;
  }

  /**
   * Refuses while `key` is paused. Called **before** the password is checked:
   * a pause that let the right password through would tell a guesser which
   * one was right. "Never" lifts any pause at once.
   */
  async assertOpen(key: string): Promise<void> {
    if ((await this.settings.read()).failedSignInLimit === null) return;
    const seconds = await this.redis.ttl(`throttle:pause:${key}`);
    if (seconds > 0) throw pausedError(seconds);
  }

  /**
   * Counts one failure. The failure that reaches the limit starts the pause,
   * and the caller refuses it with `pausedError` — it is not a 401 that
   * happens to precede one.
   */
  async fail(key: string): Promise<FailureOutcome> {
    const settings = await this.settings.read();
    const limit = settings.failedSignInLimit;
    const lockoutMinutes = settings.signInLockoutMinutes;
    if (limit === null) return { remaining: null, pausedFor: null, lockoutMinutes };

    const count = `throttle:fail:${key}`;
    const failures = await this.redis.incrementWithTtl(count, settings.failedSignInWindowMinutes * 60);
    if (failures < limit) return { remaining: limit - failures, pausedFor: null, lockoutMinutes };

    const seconds = lockoutMinutes * 60;
    await this.redis.setWithTtl(`throttle:pause:${key}`, seconds);
    await this.redis.del(count);
    return { remaining: 0, pausedFor: seconds, lockoutMinutes };
  }

  /** A correct password: the failures before it no longer count. */
  async clear(key: string): Promise<void> {
    await this.redis.del(`throttle:fail:${key}`);
  }

  /**
   * One emailed code for `email` — a two-factor resend or a password-reset
   * code. Counted per address whether or not it has an account, so the
   * answer never says which addresses exist. The code a correct sign-in sends
   * is not counted: a correct sign-in is never limited.
   */
  async assertMaySendCode(email: string): Promise<void> {
    const settings = await this.settings.read();
    const limit = settings.codeSendLimit;
    if (limit === null) return;

    const key = `throttle:codes:${email.trim().toLowerCase()}`;
    const sent = await this.redis.incrementWithTtl(key, settings.codeSendWindowMinutes * 60);
    if (sent > limit) {
      const seconds = await this.redis.ttl(key);
      const wait = seconds > 0 ? seconds : settings.codeSendWindowMinutes * 60;
      throw tooMany(codesMessage(wait), wait);
    }
  }
}
