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
  .meta({ type: 'string', format: 'date', example: '2026-11-14' })
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

/**
 * A moment the system records or a user picks a time for.
 *
 * `z.coerce.date()` is the trap here, and it is the same family as
 * `z.coerce.number()`: its input is `unknown`, so it accepts `true` (1970),
 * `0` (1970) and `""` (Invalid Date) as happily as a real timestamp — and
 * because `unknown` cannot be expressed in JSON Schema, it also documented
 * itself as an empty object and crashed the OpenAPI build outright.
 *
 * This accepts an ISO 8601 datetime and nothing else, which is exactly what
 * the frontend sends.
 */
export const timestamp = z.iso
  .datetime({ message: 'Use an ISO 8601 date and time' })
  .meta({ type: 'string', format: 'date-time', example: '2026-11-14T09:30:00.000Z' })
  .transform((value) => new Date(value));
