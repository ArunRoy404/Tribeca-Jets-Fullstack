import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Meta signs every webhook with the app secret: `X-Hub-Signature-256:
 * sha256=<hex HMAC of the raw body>`. The route is public, so this is the
 * only thing that says a message came from Meta at all.
 *
 * **The HMAC is over the raw bytes**, never a re-serialised `JSON.stringify`
 * of the parsed body — key order and unicode escapes differ, and a check that
 * re-serialises fails on real traffic while passing every hand-made test.
 * Hence `rawBody: true` in `main.ts`.
 */
export function verifyMetaSignature(
  rawBody: Buffer | undefined,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!rawBody || !header?.startsWith('sha256=')) return false;
  const given = Buffer.from(header.slice('sha256='.length), 'utf8');
  const expected = Buffer.from(
    createHmac('sha256', appSecret).update(rawBody).digest('hex'),
    'utf8',
  );
  // Constant time; lengths first, since timingSafeEqual throws on a mismatch.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Builds the header Meta would send — for tests and the Postman folder. */
export function metaSignature(rawBody: Buffer | string, appSecret: string): string {
  return `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
}
