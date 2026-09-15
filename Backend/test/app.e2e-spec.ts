import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { RedisService } from '../src/core/redis/redis.service.js';

/**
 * Exercises the security posture that the rest of the API depends on:
 * routes are private by default, and sessions live in httpOnly cookies.
 */
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    // Rate-limit counters live in Redis and would otherwise carry over from a
    // previous run, making the suite fail on a second invocation.
    const redis = app.get(RedisService);
    const keys = await redis.client.keys('ratelimit:*');
    if (keys.length) await redis.client.del(...keys);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes health without authentication', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.services.database).toBe('up');
  });

  it('rejects unauthenticated access to a protected route', async () => {
    await request(app.getHttpServer()).get('/api/clients').expect(401);
  });

  it('rejects bad credentials without revealing whether the user exists', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' })
      .expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns validation errors for a malformed login body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);

    expect(res.body.errors).toHaveProperty('email');
  });

  it('issues httpOnly cookies on login and never returns a token in the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@tribecajets.com', password: 'ChangeMe123!' })
      .expect(200);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    const access = cookies.find((c) => c.startsWith('tj_access='));
    const refresh = cookies.find((c) => c.startsWith('tj_refresh='));

    expect(access).toContain('HttpOnly');
    expect(refresh).toContain('HttpOnly');
    expect(JSON.stringify(res.body)).not.toContain('tj_access');
    expect(res.body.data.email).toBe('admin@tribecajets.com');
  });

  it('authenticates a follow-up request using only the cookie', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/auth/login')
      .send({ email: 'admin@tribecajets.com', password: 'ChangeMe123!' })
      .expect(200);

    const res = await agent.get('/api/auth/me').expect(200);
    expect(res.body.data.role).toBe('SUPER_ADMIN');
  });

  it('scopes the client list so a broker sees only their own clients', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/auth/login')
      .send({ email: 'broker@tribecajets.com', password: 'ChangeMe123!' })
      .expect(200);

    const res = await agent.get('/api/clients').expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].lastName).toBe('Chen');
  });
});
