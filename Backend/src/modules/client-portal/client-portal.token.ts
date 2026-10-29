import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

const DOMAIN = 'tribeca-client-portal-v1';
const DEFAULT_TTL_DAYS = 90;

export interface ClientPortalTokenPayload {
  /** Client UUID. */
  cid: string;
  /** Issued at (Unix seconds). */
  iat: number;
  /** Expires at (Unix seconds). */
  exp: number;
}

function hmacFor(bodyB64: string, secret: string): Buffer {
  return createHmac('sha256', `${DOMAIN}:${secret}`).update(bodyB64).digest();
}

/**
 * Signs a URL-safe client portal token (`<base64url(payload)>.<base64url(hmac)>`).
 *
 * Requires no database table or migration, stays completely separate from the
 * staff `tj_access` session cookie, and is verified against the live `Client`
 * record (`deletedAt: null`) on every request.
 */
export function signClientPortalToken(
  clientId: string,
  secret: string,
  now: Date = new Date(),
  ttlDays: number = DEFAULT_TTL_DAYS,
): { token: string; expiresAt: Date } {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + ttlDays * 86_400;
  const payload: ClientPortalTokenPayload = { cid: clientId, iat, exp };
  const bodyB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = hmacFor(bodyB64, secret).toString('base64url');
  return {
    token: `${bodyB64}.${sigB64}`,
    expiresAt: new Date(exp * 1000),
  };
}

/**
 * Verifies a client portal token in constant time and returns its `clientId`.
 * Throws `401 Unauthorized` if tampered, malformed, or expired.
 */
export function verifyClientPortalToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): ClientPortalTokenPayload {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new UnauthorizedException('Invalid or expired client portal link');
  }
  const [bodyB64, sigB64] = parts;
  let actualSig: Buffer;
  try {
    actualSig = Buffer.from(sigB64, 'base64url');
  } catch {
    throw new UnauthorizedException('Invalid or expired client portal link');
  }
  const expectedSig = hmacFor(bodyB64, secret);
  if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) {
    throw new UnauthorizedException('Invalid or expired client portal link');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
  } catch {
    throw new UnauthorizedException('Invalid or expired client portal link');
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as ClientPortalTokenPayload).cid !== 'string' ||
    typeof (payload as ClientPortalTokenPayload).exp !== 'number'
  ) {
    throw new UnauthorizedException('Invalid or expired client portal link');
  }

  const parsed = payload as ClientPortalTokenPayload;
  const nowSec = Math.floor(now.getTime() / 1000);
  if (parsed.exp <= nowSec) {
    throw new UnauthorizedException('This client portal link has expired. Ask your charter advisor for a fresh link.');
  }
  return parsed;
}
