import { describe, expect, it } from 'vitest';
import { tripFigures } from '../trips/trips.figures.js';
import { bucketSpan, isoDay, rankBy, seriesBuckets, tallyByBucket, windowFromDays } from './reports.window.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const priced = (basePrice: number) =>
  tripFigures({ basePrice, operatorCost: null, fetEnabled: false, fetRate: 0, lineItems: [] });

describe('windowFromDays', () => {
  it('includes the last day the caller names', () => {
    const window = windowFromDays(day('2026-10-01'), day('2026-10-31'));
    expect(isoDay(window.from)).toBe('2026-10-01');
    expect(isoDay(window.to)).toBe('2026-11-01');
  });
});

describe('seriesBuckets', () => {
  it('gives twelve Monday-start weeks ending with the anchor week', () => {
    // 4 Oct 2026 is a Sunday; its week began Monday 28 Sep.
    const weeks = seriesBuckets('WEEK', day('2026-10-04'));
    expect(weeks).toHaveLength(12);
    expect(isoDay(weeks[11]!.start)).toBe('2026-09-28');
    expect(isoDay(weeks[11]!.end)).toBe('2026-10-05');
    expect(isoDay(weeks[0]!.start)).toBe('2026-07-13');
  });

  it('gives the twelve months of the anchor year', () => {
    const months = seriesBuckets('MONTH', day('2026-10-04'));
    expect(months.map((m) => isoDay(m.start))[0]).toBe('2026-01-01');
    expect(isoDay(months[11]!.end)).toBe('2027-01-01');
  });

  it('gives five years ending with the anchor year', () => {
    const years = seriesBuckets('YEAR', day('2026-10-04'));
    expect(years.map((y) => y.start.getUTCFullYear())).toEqual([2022, 2023, 2024, 2025, 2026]);
    const span = bucketSpan(years);
    expect(isoDay(span.from)).toBe('2022-01-01');
    expect(isoDay(span.to)).toBe('2027-01-01');
  });
});

describe('tallyByBucket', () => {
  it('puts each trip in the bucket of its departure, and the edges where they belong', () => {
    const months = seriesBuckets('MONTH', day('2026-10-04'));
    const points = tallyByBucket(months, [
      { departureDate: day('2026-09-30'), figures: priced(1_000) },
      { departureDate: day('2026-10-01'), figures: priced(2_000) },
      { departureDate: day('2026-10-31'), figures: priced(3_000) },
      { departureDate: null, figures: priced(9_999) },
    ]);
    expect(points[8]).toMatchObject({ start: '2026-09-01', tripCount: 1, revenue: 1_000 });
    expect(points[9]).toMatchObject({ start: '2026-10-01', tripCount: 2, revenue: 5_000 });
    expect(points.reduce((sum, p) => sum + p.tripCount, 0)).toBe(3);
  });
});

describe('rankBy', () => {
  const trips = [
    { broker: 'b', figures: priced(500) },
    { broker: 'a', figures: priced(500) },
    { broker: 'c', figures: priced(2_000) },
    { broker: 'a', figures: null },
  ];

  it('ranks by revenue, then trip count, then key', () => {
    const ranked = rankBy(trips, (t) => t.broker, (t) => t.broker);
    expect(ranked.map((row) => row.key)).toEqual(['c', 'a', 'b']);
    expect(ranked[1]).toMatchObject({ tripCount: 2, pricedCount: 1, revenue: 500 });
  });
});
