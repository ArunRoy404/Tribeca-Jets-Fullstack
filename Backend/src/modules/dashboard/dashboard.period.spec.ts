import { describe, expect, it } from 'vitest';
import { percentChange, periodRange } from './dashboard.period.js';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const days = (range: ReturnType<typeof periodRange>) => ({
  from: range.from.toISOString().slice(0, 10),
  to: range.to.toISOString().slice(0, 10),
  previousFrom: range.previousFrom.toISOString().slice(0, 10),
  previousTo: range.previousTo.toISOString().slice(0, 10),
});

describe('periodRange', () => {
  it('TODAY is the day, against yesterday', () => {
    expect(days(periodRange('TODAY', d('2026-09-28')))).toEqual({
      from: '2026-09-28',
      to: '2026-09-29',
      previousFrom: '2026-09-27',
      previousTo: '2026-09-28',
    });
  });

  it('WEEK starts on Monday, including when today is Sunday', () => {
    // 28 Sep 2026 is a Monday; 4 Oct is the Sunday of the same week.
    const monday = days(periodRange('WEEK', d('2026-09-28')));
    const sunday = days(periodRange('WEEK', d('2026-10-04')));
    expect(monday).toEqual(sunday);
    expect(monday).toEqual({
      from: '2026-09-28',
      to: '2026-10-05',
      previousFrom: '2026-09-21',
      previousTo: '2026-09-28',
    });
  });

  it('MONTH crosses a year boundary backwards', () => {
    expect(days(periodRange('MONTH', d('2026-01-15')))).toEqual({
      from: '2026-01-01',
      to: '2026-02-01',
      previousFrom: '2025-12-01',
      previousTo: '2026-01-01',
    });
  });

  it('QUARTER is the calendar quarter, against the one before', () => {
    expect(days(periodRange('QUARTER', d('2026-09-28')))).toEqual({
      from: '2026-07-01',
      to: '2026-10-01',
      previousFrom: '2026-04-01',
      previousTo: '2026-07-01',
    });
  });

  it('YEAR is year to date, against the same span last year', () => {
    expect(days(periodRange('YEAR', d('2026-09-28')))).toEqual({
      from: '2026-01-01',
      to: '2026-09-29',
      previousFrom: '2025-01-01',
      previousTo: '2025-09-29',
    });
  });
});

describe('percentChange', () => {
  it('is null with nothing to compare against', () => {
    expect(percentChange(5000, 0)).toBeNull();
  });

  it('rounds to a whole percent, either way', () => {
    expect(percentChange(118, 100)).toBe(18);
    expect(percentChange(50, 200)).toBe(-75);
  });
});
