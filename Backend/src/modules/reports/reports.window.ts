import { tallyTrips, type TripTally } from '../trips/trips.figures.js';
import type { PricedQuote } from '../quotes/quotes.pricing.js';

/**
 * The calendar arithmetic and grouping behind Reports (#23), as pure
 * functions. Dates are UTC calendar days, stored at midnight like every
 * `@db.Date`; windows are half-open, `[from, to)`.
 *
 * **Which date counts** (decided 4 Oct 2026, scope §17 leaves KPI formulas
 * open): revenue, profit, margin and trip counts by the day the trip
 * *departs* — the money is earned when the flight is delivered, and the
 * dashboard already counts that way. Cash and FET collected by the day a
 * *payment* arrives. Outstanding AR and AP as they stand today.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (year: number, month: number, date: number) => new Date(Date.UTC(year, month, date));

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The caller names the last day they want; the window ends the day after it. */
export function windowFromDays(from: Date, through: Date): { from: Date; to: Date } {
  return { from, to: new Date(through.getTime() + DAY_MS) };
}

export const SERIES_BUCKETS = ['WEEK', 'MONTH', 'YEAR'] as const;
export type SeriesBucket = (typeof SERIES_BUCKETS)[number];

export interface Bucket {
  start: Date;
  end: Date;
}

/**
 * The chart's columns around `anchor`: the twelve weeks ending with the week
 * that contains it (weeks start on Monday), the twelve months of its year,
 * or the five years ending with its year.
 */
export function seriesBuckets(bucket: SeriesBucket, anchor: Date): Bucket[] {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const date = anchor.getUTCDate();

  if (bucket === 'WEEK') {
    const monday = date - ((anchor.getUTCDay() + 6) % 7);
    return Array.from({ length: 12 }, (_, i) => {
      const offset = (i - 11) * 7;
      return { start: utcDay(year, month, monday + offset), end: utcDay(year, month, monday + offset + 7) };
    });
  }
  if (bucket === 'MONTH') {
    return Array.from({ length: 12 }, (_, i) => ({ start: utcDay(year, i, 1), end: utcDay(year, i + 1, 1) }));
  }
  return Array.from({ length: 5 }, (_, i) => ({
    start: utcDay(year - 4 + i, 0, 1),
    end: utcDay(year - 3 + i, 0, 1),
  }));
}

/** The whole span the buckets cover, for one query. */
export function bucketSpan(buckets: Bucket[]): { from: Date; to: Date } {
  return { from: buckets[0]!.start, to: buckets[buckets.length - 1]!.end };
}

/** Each bucket's tally, from trips dated by their departure. */
export function tallyByBucket(
  buckets: Bucket[],
  trips: { departureDate: Date | null; figures: PricedQuote | null }[],
): (TripTally & { start: string })[] {
  return buckets.map((bucket) => ({
    start: isoDay(bucket.start),
    ...tallyTrips(
      trips
        .filter(
          (trip) =>
            trip.departureDate !== null &&
            trip.departureDate.getTime() >= bucket.start.getTime() &&
            trip.departureDate.getTime() < bucket.end.getTime(),
        )
        .map((trip) => trip.figures),
    ),
  }));
}

/**
 * Trips grouped by a key — a broker, a client, a route — each group tallied,
 * largest revenue first. Ties break on trip count and then on the key, so a
 * page boundary never shuffles two equal rows.
 */
export function rankBy<Trip extends { figures: PricedQuote | null }, Subject>(
  trips: Trip[],
  keyOf: (trip: Trip) => string,
  subjectOf: (trip: Trip) => Subject,
): ({ key: string; subject: Subject } & TripTally)[] {
  const groups = new Map<string, Trip[]>();
  for (const trip of trips) {
    const key = keyOf(trip);
    const group = groups.get(key);
    if (group) group.push(trip);
    else groups.set(key, [trip]);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      subject: subjectOf(group[0]!),
      ...tallyTrips(group.map((trip) => trip.figures)),
    }))
    .sort(
      (a, b) =>
        b.revenue - a.revenue || b.tripCount - a.tripCount || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    );
}
