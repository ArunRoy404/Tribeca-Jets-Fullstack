/**
 * The dashboard's date filter (#24) — which window of departures the money
 * tiles count, and the window before it that the comparison reads.
 *
 * Pure, and in UTC calendar days: `on` is the desk's today as a `YYYY-MM-DD`
 * the browser sends, stored at midnight UTC like every `@db.Date`, so a desk
 * in New York at 9pm on the 30th is still asking about the 30th.
 *
 * Windows are half-open, `[from, to)`. A week starts on Monday. TODAY, WEEK,
 * MONTH and QUARTER are the whole calendar period — a trip booked for Friday
 * is this week's revenue on Monday — and YEAR is year to date, compared with
 * the same span of last year.
 */
export const DASHBOARD_PERIODS = ['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export interface PeriodRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

const day = (year: number, month: number, date: number) => new Date(Date.UTC(year, month, date));

export function periodRange(period: DashboardPeriod, on: Date): PeriodRange {
  const year = on.getUTCFullYear();
  const month = on.getUTCMonth();
  const date = on.getUTCDate();

  switch (period) {
    case 'TODAY':
      return {
        from: day(year, month, date),
        to: day(year, month, date + 1),
        previousFrom: day(year, month, date - 1),
        previousTo: day(year, month, date),
      };
    case 'WEEK': {
      const sinceMonday = (on.getUTCDay() + 6) % 7;
      const monday = date - sinceMonday;
      return {
        from: day(year, month, monday),
        to: day(year, month, monday + 7),
        previousFrom: day(year, month, monday - 7),
        previousTo: day(year, month, monday),
      };
    }
    case 'MONTH':
      return {
        from: day(year, month, 1),
        to: day(year, month + 1, 1),
        previousFrom: day(year, month - 1, 1),
        previousTo: day(year, month, 1),
      };
    case 'QUARTER': {
      const first = Math.floor(month / 3) * 3;
      return {
        from: day(year, first, 1),
        to: day(year, first + 3, 1),
        previousFrom: day(year, first - 3, 1),
        previousTo: day(year, first, 1),
      };
    }
    case 'YEAR':
      return {
        from: day(year, 0, 1),
        to: day(year, month, date + 1),
        previousFrom: day(year - 1, 0, 1),
        // The same span last year. 29 February rolls to 1 March, which is
        // still "through the same day".
        previousTo: day(year - 1, month, date + 1),
      };
  }
}

/**
 * Change against the previous window, as a whole percentage — or null when
 * there is nothing to compare with. "+∞% vs last week" is not a figure, and
 * neither is a change measured from a window with no data.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
