import { z } from 'zod';

/**
 * A date the desk picks from a calendar, with no time of day.
 *
 * Accepts `YYYY-MM-DD` and stores midnight UTC against a `DATE` column, so it
 * comes back as the day that was typed rather than shifting for whoever reads
 * it. A maintenance inspection booked for the 14th must not read as the 13th
 * for a broker in Los Angeles.
 *
 * Shared because three modules now want it — aircraft maintenance dates, trip
 * request departure and return, and the sourcing quote deadline. It lived as
 * two identical private copies before that, which is one more than the rule
 * allows.
 *
 * Use this for a day the user names. For an instant the system records —
 * `requestedAt`, `respondedAt` — use a real timestamp, not this.
 */
export const calendarDate = z.iso
  .date('Use a YYYY-MM-DD date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));
