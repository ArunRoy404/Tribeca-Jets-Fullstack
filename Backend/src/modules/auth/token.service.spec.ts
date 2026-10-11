import { describe, expect, it, vi } from 'vitest';
import { TokenService, parseDuration } from './token.service.js';

describe('parseDuration', () => {
  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['2h', 7_200_000],
    ['7d', 604_800_000],
  ])('converts %s to %i ms', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each(['15', 'm', '15min', '', '-5m', '1w'])(
    'rejects malformed duration %s',
    (input) => {
      // Throwing at boot is deliberate: a silently-wrong TTL would produce
      // sessions that never expire or expire instantly.
      expect(() => parseDuration(input)).toThrow(/Invalid duration/);
    },
  );
});


/**
 * The session rules that decide whether someone is signed out (7 Oct 2026):
 * idleness is measured from real activity, two tabs renewing at once is not
 * theft, and a genuinely replayed token still ends every session.
 */
describe('TokenService sessions', () => {
  const minutes = (n: number) => n * 60_000;
  const config = {
    auth: {
      accessSecret: 'test-secret',
      accessTtl: '10m',
      refreshTtl: '7d',
      refreshTtlRemembered: '30d',
      cookieDomain: undefined,
      cookieSecure: false,
    },
  };
  // The idle timeout is the company's Security & Session setting.
  const settings = { current: () => ({ idleTimeoutMinutes: 10 }) };
  const user = { id: 'u1', email: 'a@example.com', role: 'BROKER', status: 'ACTIVE', deletedAt: null };

  function setup(stored: Record<string, unknown> | null, replacement?: Record<string, unknown>) {
    const prisma = {
      refreshToken: {
        findUnique: vi.fn(async ({ where }: { where: { tokenHash?: string; id?: string } }) =>
          where.id ? (replacement ?? null) : stored,
        ),
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({ count: 1 })),
        create: vi.fn(async () => ({ id: 'new' })),
      },
      user: { findUnique: vi.fn(async () => ({ role: 'BROKER', permissions: null })) },
    };
    const jwt = { signAsync: vi.fn(async () => 'access') };
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const service = new TokenService(jwt as never, prisma as never, config as never, settings as never);
    return { service, prisma, res };
  }

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 't1',
    userId: 'u1',
    user,
    revokedAt: null,
    replacedByTokenId: null,
    expiresAt: new Date(Date.now() + minutes(60 * 24)),
    createdAt: new Date(Date.now() - minutes(30)),
    sessionStartedAt: new Date(Date.now() - minutes(60)),
    lastActiveAt: new Date(Date.now() - minutes(2)),
    ...overrides,
  });

  it('renews a session that was active recently, however old its token', async () => {
    const { service, res } = setup(row());
    await expect(service.rotateSession(res as never, 'presented', {})).resolves.toMatchObject({ id: 'u1' });
    expect(res.cookie).toHaveBeenCalled();
  });

  it('refuses a session nobody has used for longer than the idle limit, and ends only that one', async () => {
    const { service, prisma, res } = setup(row({ lastActiveAt: new Date(Date.now() - minutes(16)) }));
    await expect(service.rotateSession(res as never, 'presented', {})).rejects.toThrow(/inactivity/);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', revokedAt: null }) }),
    );
  });

  it('answers the second of two tabs renewing at once without new cookies or revoking anything', async () => {
    const stored = row({ revokedAt: new Date(Date.now() - 5_000), replacedByTokenId: 't2' });
    const { service, prisma, res } = setup(stored, { revokedAt: null, expiresAt: new Date(Date.now() + minutes(60)) });
    await expect(service.rotateSession(res as never, 'presented', {})).resolves.toMatchObject({ id: 'u1' });
    expect(res.cookie).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('still treats a replayed token outside the grace window as theft and ends every session', async () => {
    const stored = row({ revokedAt: new Date(Date.now() - minutes(5)), replacedByTokenId: 't2' });
    const { service, prisma, res } = setup(stored, { revokedAt: null, expiresAt: new Date(Date.now() + minutes(60)) });
    await expect(service.rotateSession(res as never, 'presented', {})).rejects.toThrow(/expired/);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
    );
  });

  it('records activity only on a live session', async () => {
    const { service, prisma } = setup(null);
    await expect(service.touchSession(undefined)).resolves.toBe(false);
    await expect(service.touchSession('presented')).resolves.toBe(true);
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.touchSession('presented')).resolves.toBe(false);
  });
});
