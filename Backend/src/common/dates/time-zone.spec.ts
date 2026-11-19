import { describe, expect, it } from 'vitest';
import { DEFAULT_TIME_ZONE, formatMomentIn, nowIn, timeZoneSchema } from './time-zone.js';

describe('timeZoneSchema', () => {
  it('trims and accepts a named zone', () => {
    expect(timeZoneSchema.parse(' Europe/London ')).toBe('Europe/London');
  });

  it('uses the runtime’s canonical name for lower-case input when supported', () => {
    const input = 'asia/dhaka';
    let canonical: string | undefined;
    try {
      canonical = new Intl.DateTimeFormat('en-US', { timeZone: input }).resolvedOptions().timeZone;
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
    if (canonical) expect(timeZoneSchema.parse(input)).toBe(canonical);
    else expect(timeZoneSchema.safeParse(input).success).toBe(false);
  });

  it.each(['Mars/Olympus', '+06:00', 'GMT+6', 'Etc/GMT+6', ''])('refuses %j', (value) => {
    const result = timeZoneSchema.safeParse(value);
    expect(result.error?.issues[0]?.message).toBe('Use a time zone name, e.g. America/New_York');
  });
});

describe('nowIn', () => {
  it.each([
    ['2026-11-19T17:59:00Z', { date: '2026-11-19', weekday: 'Thu', time: '23:59' }],
    ['2026-11-19T18:00:00Z', { date: '2026-11-20', weekday: 'Fri', time: '00:00' }],
  ])('rolls Dhaka’s date at 18:00 UTC (%s)', (value, expected) => {
    expect(nowIn('Asia/Dhaka', new Date(value))).toEqual(expected);
  });

  it.each([
    ['2026-11-01T05:59:00Z', '01:59'],
    ['2026-11-01T06:00:00Z', '01:00'],
  ])('follows New York’s transition from EDT to EST (%s)', (value, time) => {
    expect(nowIn(DEFAULT_TIME_ZONE, new Date(value))).toEqual({ date: '2026-11-01', weekday: 'Sun', time });
  });
});

describe('formatMomentIn', () => {
  it('names the local date and time on a 24-hour clock', () => {
    expect(formatMomentIn('2026-11-20T08:30:00Z', 'Asia/Dhaka')).toBe('Fri 20 Nov 2026, 14:30');
  });

  it('leaves missing and invalid timestamps blank', () => {
    expect(formatMomentIn(null, DEFAULT_TIME_ZONE)).toBeNull();
    expect(formatMomentIn('invalid', DEFAULT_TIME_ZONE)).toBeNull();
    expect(formatMomentIn(new Date(NaN), DEFAULT_TIME_ZONE)).toBeNull();
  });
});
