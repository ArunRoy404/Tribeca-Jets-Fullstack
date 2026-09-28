import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKey,
  statWindows,
  windowDays,
  yearCalendar,
  yearWindow,
} from './schedule.calendar.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('windowDays', () => {
  it('counts both ends', () => {
    expect(windowDays(day('2026-08-10'), day('2026-08-10'))).toBe(1);
    expect(windowDays(day('2026-08-01'), day('2026-09-11'))).toBe(42);
  });

  it('crosses a month and a year end', () => {
    expect(windowDays(day('2026-12-28'), day('2027-01-03'))).toBe(7);
  });
});

describe('statWindows', () => {
  it('is today, tomorrow, and a week from today', () => {
    const windows = statWindows(day('2026-12-30'));
    expect(dayKey(windows.today)).toBe('2026-12-30');
    expect(dayKey(windows.tomorrow)).toBe('2026-12-31');
    expect(dayKey(windows.weekEnd)).toBe('2027-01-06');
  });
});

describe('yearCalendar', () => {
  it('counts per month and per day', () => {
    const calendar = yearCalendar(2026, [
      { day: day('2026-01-01'), count: 2 },
      { day: day('2026-01-31'), count: 1 },
      { day: day('2026-12-31'), count: 3 },
    ]);
    expect(calendar.months[0]).toBe(3);
    expect(calendar.months[11]).toBe(3);
    expect(calendar.total).toBe(6);
    expect(calendar.days).toEqual({ '2026-01-01': 2, '2026-01-31': 1, '2026-12-31': 3 });
  });

  it('ignores a day outside the year rather than filing it under a month', () => {
    const calendar = yearCalendar(2026, [{ day: day('2027-01-01'), count: 4 }]);
    expect(calendar.total).toBe(0);
    expect(calendar.days).toEqual({});
  });

  it('matches the window it was queried with', () => {
    const { from, to } = yearWindow(2026);
    expect(dayKey(from)).toBe('2026-01-01');
    expect(dayKey(to)).toBe('2026-12-31');
    expect(windowDays(from, addDays(to, 0))).toBe(365);
  });
});
