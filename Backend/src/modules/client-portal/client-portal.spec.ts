import { describe, expect, it } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { signClientPortalToken, verifyClientPortalToken } from './client-portal.token.js';

describe('client-portal token signing and verification (#33)', () => {
  const SECRET = 'test-access-secret-for-client-portal-spec-32b';
  const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440000';

  it('signs and verifies a valid client portal token', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    const { token, expiresAt } = signClientPortalToken(CLIENT_ID, SECRET, now, 30);
    expect(token).toContain('.');
    expect(expiresAt.toISOString()).toBe('2026-11-28T12:00:00.000Z');

    const payload = verifyClientPortalToken(token, SECRET, new Date('2026-11-01T00:00:00Z'));
    expect(payload.cid).toBe(CLIENT_ID);
  });

  it('rejects a token signed with a different secret', () => {
    const { token } = signClientPortalToken(CLIENT_ID, SECRET);
    expect(() => verifyClientPortalToken(token, 'wrong-secret')).toThrow(UnauthorizedException);
  });

  it('rejects a token with a tampered payload', () => {
    const { token } = signClientPortalToken(CLIENT_ID, SECRET);
    const [, sig] = token.split('.');
    const fakeBody = Buffer.from(
      JSON.stringify({ cid: '00000000-0000-0000-0000-000000000000', iat: 1, exp: 9999999999 }),
      'utf8',
    ).toString('base64url');
    expect(() => verifyClientPortalToken(`${fakeBody}.${sig}`, SECRET)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const issued = new Date('2026-01-01T00:00:00Z');
    const { token } = signClientPortalToken(CLIENT_ID, SECRET, issued, 10);
    const afterExpiry = new Date('2026-02-01T00:00:00Z');
    expect(() => verifyClientPortalToken(token, SECRET, afterExpiry)).toThrow(UnauthorizedException);
  });
});
