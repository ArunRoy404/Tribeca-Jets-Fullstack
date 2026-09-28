/**
 * The calendar arithmetic for Schedule (#13), as pure functions with tests.
 *
 * Every day here is a calendar day stored as midnight UTC — the same
 * `calendarDate` the trip legs use — so a day is compared and keyed in UTC and
 * never shifts for whoever reads it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The widest window one list request may ask for. A month view shows six
 * weeks — the month plus the days either side that fill its first and last
 * rows — so 42 days covers every view the calendar has, and nothing wider
 * turns into "fetch the whole year" by accident. The year view reads counts,
 * not legs.
 */
export const MAX_WINDOW_DAYS = 42;

/** Days in [from, to], both ends counted. */
export function windowDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
}

export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

/** "2026-08-10" — the key the frontend files a day under. */
export function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/** 1 Jan to 31 Dec of a year, as calendar days. */
export function yearWindow(year: number): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(year, 0, 1)), to: new Date(Date.UTC(year, 11, 31)) };
}

/** The tiles' three windows: today, and tomorrow through a week from today. */
export function statWindows(today: Date): { today: Date; tomorrow: Date; weekEnd: Date } {
  return { today, tomorrow: addDays(today, 1), weekEnd: addDays(today, 7) };
}

/**
 * Per-day counts folded into the year view's shape: a count per month, in
 * order, and a count per day that has any. Days outside the year are
 * ignored rather than filed under the wrong month.
 */
export function yearCalendar(year: number, counts: { day: Date; count: number }[]) {
  const months = Array.from({ length: 12 }, () => 0);
  const days: Record<string, number> = {};
  for (const { day, count } of counts) {
    if (day.getUTCFullYear() !== year || count <= 0) continue;
    months[day.getUTCMonth()] += count;
    const key = dayKey(day);
    days[key] = (days[key] ?? 0) + count;
  }
  return { year, total: months.reduce((sum, n) => sum + n, 0), months, days };
}

/**
 * What the itinerary knows about this leg's flight. `Itinerary.arrivalTime`
 * and `flightTime` describe the *outbound* leg only — nothing records either
 * for a return or a later leg — so any other leg gets null, never the
 * outbound's figure. A withdrawn itinerary is no source at all.
 */
export function itineraryTimes(
  sequence: number,
  itinerary: { arrivalTime: string | null; flightTime: string | null; deletedAt: Date | null } | null,
): { arrivalTime: string | null; flightTime: string | null } {
  if (!itinerary || itinerary.deletedAt || sequence !== 1) return { arrivalTime: null, flightTime: null };
  return { arrivalTime: itinerary.arrivalTime, flightTime: itinerary.flightTime };
}
