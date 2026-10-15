import { HttpStatus, type HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { FailedSignInScope } from '../../generated/prisma/enums.js';
import { invalidMessage, pausedMessage, subjectKey, waitPhrase } from './sign-in-throttle.js';
import { SignInThrottleService } from './sign-in-throttle.service.js';

/**
 * Settings › Rate Limiting (owner's decision, 15 Oct 2026): only failures
 * count, a right password clears them, a pause refuses everything, and a
 * null limit is "Never".
 */

describe('whose failures count together', () => {
  const subject = { email: 'broker@example.com', ip: '203.0.113.9' };

  it('keeps one account on one network apart from everyone else by default', () => {
    expect(subjectKey(FailedSignInScope.ACCOUNT_AND_IP, subject)).toBe(
      'account:broker@example.com|ip:203.0.113.9',
    );
  });

  it('counts an account from anywhere, or a network whatever the email', () => {
    expect(subjectKey(FailedSignInScope.ACCOUNT, subject)).toBe('account:broker@example.com');
    expect(subjectKey(FailedSignInScope.IP, subject)).toBe('ip:203.0.113.9');
  });
});

describe('what the person is told', () => {
  it('says how long the wait is, never just "later"', () => {
    expect(waitPhrase(30)).toBe('less than a minute');
    expect(waitPhrase(60)).toBe('1 minute');
    expect(waitPhrase(14 * 60 + 5)).toBe('15 minutes');
    expect(waitPhrase(86_400)).toBe('24 hours');
    expect(pausedMessage(900)).toBe('Too many failed sign-in attempts. Please try again in 15 minutes.');
  });

  it('warns only when two or fewer attempts are left', () => {
    expect(invalidMessage(4, 15)).toBe('Invalid email or password.');
    expect(invalidMessage(null, 15)).toBe('Invalid email or password.');
    expect(invalidMessage(1, 15)).toBe(
      'Invalid email or password. 1 more failed attempt will pause sign-in for 15 minutes.',
    );
  });
});

/** Redis as a map with expiry counted in whole seconds from a fake clock. */
class FakeRedis {
  now = 0;
  private store = new Map<string, { value: number; expiresAt: number }>();

  private live(key: string) {
    const entry = this.store.get(key);
    if (entry && entry.expiresAt <= this.now) this.store.delete(key);
    return this.store.get(key);
  }

  async incrementWithTtl(key: string, ttlSeconds: number) {
    const entry = this.live(key);
    if (entry) return ++entry.value;
    this.store.set(key, { value: 1, expiresAt: this.now + ttlSeconds });
    return 1;
  }

  async ttl(key: string) {
    const entry = this.live(key);
    return entry ? entry.expiresAt - this.now : -2;
  }

  async setWithTtl(key: string, ttlSeconds: number) {
    this.store.set(key, { value: 1, expiresAt: this.now + ttlSeconds });
  }

  async del(...keys: string[]) {
    for (const key of keys) this.store.delete(key);
  }
}

describe('SignInThrottleService', () => {
  let redis: FakeRedis;
  let settings: Record<string, unknown>;
  let throttle: SignInThrottleService;
  const key = 'signin:account:broker@example.com|ip:203.0.113.9';

  const status = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 'open';
    } catch (error) {
      return (error as HttpException).getStatus();
    }
  };

  beforeEach(() => {
    redis = new FakeRedis();
    settings = {
      failedSignInLimit: 3,
      failedSignInWindowMinutes: 15,
      signInLockoutMinutes: 15,
      failedSignInScope: FailedSignInScope.ACCOUNT_AND_IP,
      codeSendLimit: 2,
      codeSendWindowMinutes: 15,
      codeAttemptLimit: 5,
    };
    throttle = new SignInThrottleService(
      redis as never,
      { read: async () => settings } as never,
    );
  });

  it('never limits a correct sign-in, however often — only failures are counted', async () => {
    for (let i = 0; i < 50; i += 1) {
      expect(await status(throttle.assertOpen(key))).toBe('open');
      await throttle.clear(key);
    }
  });

  it('counts down, and the failure that reaches the limit starts the pause', async () => {
    expect((await throttle.fail(key)).remaining).toBe(2);
    expect((await throttle.fail(key)).remaining).toBe(1);
    const third = await throttle.fail(key);
    expect(third).toMatchObject({ remaining: 0, pausedFor: 900 });
    expect(await status(throttle.assertOpen(key))).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('lifts the pause when it runs out, with the count started afresh', async () => {
    for (let i = 0; i < 3; i += 1) await throttle.fail(key);
    redis.now += 15 * 60;
    expect(await status(throttle.assertOpen(key))).toBe('open');
    expect((await throttle.fail(key)).remaining).toBe(2);
  });

  it('forgets earlier mistakes once the right password is given', async () => {
    await throttle.fail(key);
    await throttle.fail(key);
    await throttle.clear(key);
    expect((await throttle.fail(key)).remaining).toBe(2);
  });

  it('only counts failures inside the window', async () => {
    await throttle.fail(key);
    await throttle.fail(key);
    redis.now += 15 * 60;
    expect((await throttle.fail(key)).remaining).toBe(2);
  });

  it('keeps one person\'s mistakes off another\'s count', async () => {
    for (let i = 0; i < 3; i += 1) await throttle.fail(key);
    expect(await status(throttle.assertOpen('signin:account:assistant@example.com|ip:203.0.113.9'))).toBe('open');
  });

  it('under "Never", counts nothing and lifts a pause already running', async () => {
    for (let i = 0; i < 3; i += 1) await throttle.fail(key);
    settings.failedSignInLimit = null;
    expect(await status(throttle.assertOpen(key))).toBe('open');
    expect(await throttle.fail(key)).toMatchObject({ remaining: null, pausedFor: null });
  });

  it('limits the codes sent to one address, and says for how long', async () => {
    await throttle.assertMaySendCode('Broker@Example.com');
    await throttle.assertMaySendCode('broker@example.com');
    const refused = await throttle.assertMaySendCode('broker@example.com').catch((error) => error);
    expect(refused.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(refused.getResponse().message).toContain('15 minutes');
    // Another address has its own allowance.
    expect(await status(throttle.assertMaySendCode('assistant@example.com'))).toBe('open');
  });

  it('sends codes without limit under "Never"', async () => {
    settings.codeSendLimit = null;
    for (let i = 0; i < 20; i += 1) {
      expect(await status(throttle.assertMaySendCode('broker@example.com'))).toBe('open');
    }
  });
});
