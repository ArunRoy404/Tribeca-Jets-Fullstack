import { describe, expect, it } from 'vitest';
import { parseDuration } from './token.service.js';

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
