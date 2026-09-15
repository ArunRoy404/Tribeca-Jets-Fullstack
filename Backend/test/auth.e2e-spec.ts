import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { RedisService } from '../src/core/redis/redis.service.js';
import { MailService } from '../src/core/mail/mail.service.js';

const SECURE_USER = 'security@tribecajets.com';
const BROKER = 'broker@tribecajets.com';
// Password-reset tests mutate credentials, so they target a dedicated account
// rather than one the sign-in and scoping tests depend on.
const RESET_TARGET = 'reset-demo@tribecajets.com';
const PASSWORD = 'ChangeMe123!';

/**
 * Covers the two multi-step auth flows behind the frontend's OTP screens.
 *
 * Codes are captured by spying on MailService rather than read from the
 * database, because they are stored hashed — which is exactly the property
 * being relied on.
 */
describe('Auth flows (e2e)', () => {
  let app: INestApplication;
  let mail: MailService;

  const cookiesOf = (res: request.Response): string[] =>
    (res.headers['set-cookie'] as unknown as string[]) ?? [];

  const cookieNames = (res: request.Response): string[] =>
    cookiesOf(res).map((c) => c.split('=')[0]!);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    mail = app.get(MailService);

    const redis = app.get(RedisService);
    const keys = await redis.client.keys('ratelimit:*');
    if (keys.length) await redis.client.del(...keys);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Rate limits are per route + identity and would otherwise trip midway
    // through a suite that signs in repeatedly.
    const redis = app.get(RedisService);
    const keys = await redis.client.keys('ratelimit:*');
    if (keys.length) await redis.client.del(...keys);
  });

  describe('two-factor sign-in', () => {
    it('withholds the session until the code is verified', async () => {
      const spy = vi.spyOn(mail, 'sendTwoFactorCode').mockResolvedValue();
      const agent = request.agent(app.getHttpServer());

      const login = await agent
        .post('/api/auth/login')
        .send({ email: SECURE_USER, password: PASSWORD })
        .expect(200);

      expect(login.body.data.requiresTwoFactor).toBe(true);
      // The masked address confirms which inbox to check without printing it.
      expect(login.body.data.email).toMatch(/^se\*+@tribecajets\.com$/);

      // Only the challenge cookie exists at this point.
      expect(cookieNames(login)).toContain('tj_2fa');
      expect(cookieNames(login)).not.toContain('tj_access');

      // A correct password alone must not authenticate anything.
      await agent.get('/api/auth/me').expect(401);

      const code = spy.mock.calls[0]![2];

      const verify = await agent
        .post('/api/auth/two-factor/verify')
        .send({ code })
        .expect(200);

      expect(cookieNames(verify)).toContain('tj_access');
      expect(cookieNames(verify)).toContain('tj_refresh');

      const me = await agent.get('/api/auth/me').expect(200);
      expect(me.body.data.email).toBe(SECURE_USER);

      spy.mockRestore();
    });

    it('counts down remaining attempts and burns the code at the limit', async () => {
      const spy = vi.spyOn(mail, 'sendTwoFactorCode').mockResolvedValue();
      const agent = request.agent(app.getHttpServer());

      await agent
        .post('/api/auth/login')
        .send({ email: SECURE_USER, password: PASSWORD })
        .expect(200);

      const first = await agent
        .post('/api/auth/two-factor/verify')
        .send({ code: '000000' })
        .expect(400);
      expect(first.body.message).toContain('4 attempts remaining');

      for (let i = 0; i < 4; i++) {
        await agent.post('/api/auth/two-factor/verify').send({ code: '000000' });
      }

      // The real code is now dead, not merely rejected once.
      const realCode = spy.mock.calls[0]![2];
      const afterBurn = await agent
        .post('/api/auth/two-factor/verify')
        .send({ code: realCode })
        .expect(400);
      expect(afterBurn.body.message).toMatch(/expired|new code/i);

      spy.mockRestore();
    });

    it('returns the code in devCode while SMTP is unconfigured', async () => {
      const agent = request.agent(app.getHttpServer());
      const login = await agent
        .post('/api/auth/login')
        .send({ email: SECURE_USER, password: PASSWORD })
        .expect(200);

      // Development convenience so the OTP screens work without a mailbox.
      // Gated on NOT production AND the log mail driver; production refuses to
      // boot without SMTP, so no real deployment can reach this.
      expect(login.body.data.devCode.code).toMatch(/^\d{6}$/);
      expect(login.body.data.devCode.notice).toContain('SMTP is not configured');

      // It must still be a working code, not a placeholder.
      await agent
        .post('/api/auth/two-factor/verify')
        .send({ code: login.body.data.devCode.code })
        .expect(200);
    });

    it('rejects a malformed code before touching the challenge', async () => {
      const agent = request.agent(app.getHttpServer());
      const res = await agent
        .post('/api/auth/two-factor/verify')
        .send({ code: 'abc' })
        .expect(400);

      expect(res.body.errors).toHaveProperty('code');
    });
  });

  describe('password reset', () => {
    it('is indistinguishable for registered and unregistered addresses', async () => {
      const known = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: BROKER })
        .expect(200);

      const unknown = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'definitely-not-a-user@example.com' })
        .expect(200);

      // Same message, and both set a challenge cookie: the absence of one
      // would leak which addresses have accounts just as loudly as a 404.
      expect(unknown.body.data.message).toBe(known.body.data.message);
      expect(cookieNames(unknown)).toContain('tj_pwreset');
      expect(cookieNames(known)).toContain('tj_pwreset');
    });

    it('completes a reset and revokes existing sessions', async () => {
      const spy = vi.spyOn(mail, 'sendPasswordResetCode').mockResolvedValue();
      const newPassword = 'RotatedPass123';

      // An established session that the reset must invalidate.
      const existing = request.agent(app.getHttpServer());
      await existing
        .post('/api/auth/login')
        .send({ email: RESET_TARGET, password: PASSWORD })
        .expect(200);
      await existing.get('/api/auth/me').expect(200);

      const resetAgent = request.agent(app.getHttpServer());
      await resetAgent
        .post('/api/auth/forgot-password')
        .send({ email: RESET_TARGET })
        .expect(200);

      const code = spy.mock.calls[0]![2];

      await resetAgent
        .post('/api/auth/forgot-password/verify')
        .send({ code })
        .expect(200);

      await resetAgent
        .post('/api/auth/reset-password')
        .send({ newPassword, confirmPassword: newPassword })
        .expect(200);

      // Old credentials are dead, new ones work.
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: RESET_TARGET, password: PASSWORD })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: RESET_TARGET, password: newPassword })
        .expect(200);

      // The pre-existing refresh token must no longer rotate.
      await existing.post('/api/auth/refresh').expect(401);

      // Restore the seeded password so the suite is re-runnable.
      const restore = request.agent(app.getHttpServer());
      await restore.post('/api/auth/forgot-password').send({ email: RESET_TARGET });
      const restoreCode = spy.mock.calls.at(-1)![2];
      await restore
        .post('/api/auth/forgot-password/verify')
        .send({ code: restoreCode })
        .expect(200);
      await restore
        .post('/api/auth/reset-password')
        .send({ newPassword: PASSWORD, confirmPassword: PASSWORD })
        .expect(200);

      spy.mockRestore();
    });

    it('refuses to set a password without a verified challenge', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/api/auth/forgot-password')
        .send({ email: RESET_TARGET })
        .expect(200);

      // Code never verified, so the reset step must not be reachable.
      await agent
        .post('/api/auth/reset-password')
        .send({ newPassword: 'SkipTheCode1', confirmPassword: 'SkipTheCode1' })
        .expect(400);
    });

    it('enforces the password policy', async () => {
      const agent = request.agent(app.getHttpServer());
      const res = await agent
        .post('/api/auth/reset-password')
        .send({ newPassword: 'short', confirmPassword: 'short' })
        .expect(400);

      expect(res.body.errors.newPassword).toMatch(/at least 10 characters/);
    });
  });
});
