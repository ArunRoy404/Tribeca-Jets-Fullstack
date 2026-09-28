import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { paginationSchema } from '../../../common/dto/pagination.dto.js';
import { FlightStatus, TripStatus, TripType } from '../../../generated/prisma/enums.js';

/** The same trip filters as the calendar, so the two boards read alike. */
const tripFilters = {
  /** A trip status. Absent leaves cancelled trips off. */
  status: z.enum(TripStatus).optional(),
  type: z.enum(TripType).optional(),
  assignedBrokerId: z.uuid().optional(),
  operatorId: z.uuid().optional(),
  aircraftId: z.uuid().optional(),
  /** The trip reference ("TJ-1048" or "1048"), client, tail, model or operator. */
  search: z.string().trim().min(1).max(200).optional(),
  /**
   * The day the board counts as today — the browser's own date, so a desk in
   * New York at 9pm is not moved into tomorrow. Defaults to today in UTC.
   */
  on: calendarDate.optional(),
};

export const FLIGHT_WINDOWS = ['ACTIVE', 'TODAY', 'PAST'] as const;

/**
 * `.strict()`, with no `sortBy`/`sortOrder`: the board has one order — nearest
 * flight first, or most recent first on PAST — and a parameter it would
 * silently ignore is a wrong answer (AGENTS.md).
 */
export const queryFlightsSchema = paginationSchema
  .pick({ page: true, limit: true })
  .extend({
    ...tripFilters,
    /** ACTIVE (today onward, plus anything reported in the air or delayed), TODAY or PAST. Absent: every flight. */
    window: z.enum(FLIGHT_WINDOWS).optional(),
    /** A reported state, or NONE for a flight nobody has reported on yet. */
    flightStatus: z.union([z.enum(FlightStatus), z.literal('NONE')]).optional(),
  })
  .strict();

export type QueryFlightsInput = z.infer<typeof queryFlightsSchema>;
export class QueryFlightsDto extends createZodDto(queryFlightsSchema) {}

export const flightStatsSchema = z.object(tripFilters).strict();
export type FlightStatsInput = z.infer<typeof flightStatsSchema>;
export class FlightStatsDto extends createZodDto(flightStatsSchema) {}

/** "HH:MM", 24-hour — the same local-time convention as a leg's departure. */
const localTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:30');

/**
 * A report on one flight. Every field optional and none defaulted — written
 * out rather than `.partial()` (AGENTS.md) — and a report that changes nothing
 * is refused by the service rather than written as an empty entry.
 */
export const updateFlightSchema = z
  .object({
    flightStatus: z.enum(FlightStatus).optional(),
    /** The operator's latest arrival estimate, local at the destination. Null clears it. */
    estimatedArrival: localTime.nullable().optional(),
    /** A public tracking page for the tail. Null clears it. */
    trackingUrl: z
      .url({ protocol: /^https?$/, message: 'Use a full http(s) link' })
      .max(500)
      .nullable()
      .optional(),
    /** What was heard — recorded on the flight's timeline with the change. */
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export type UpdateFlightInput = z.infer<typeof updateFlightSchema>;
export class UpdateFlightDto extends createZodDto(updateFlightSchema) {}
