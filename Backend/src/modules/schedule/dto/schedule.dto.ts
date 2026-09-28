import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { paginationSchema } from '../../../common/dto/pagination.dto.js';
import { TripStatus, TripType } from '../../../generated/prisma/enums.js';
import { MAX_WINDOW_DAYS, windowDays } from '../schedule.calendar.js';

/**
 * What narrows the calendar — the same fields on the list, the tiles and the
 * year counts, so the tiles always describe the calendar under them.
 */
const filters = {
  /** A trip status. Absent leaves cancelled trips off; CANCELLED shows only them. */
  status: z.enum(TripStatus).optional(),
  type: z.enum(TripType).optional(),
  assignedBrokerId: z.uuid().optional(),
  operatorId: z.uuid().optional(),
  aircraftId: z.uuid().optional(),
  /** The trip reference ("TJ-1048" or "1048"), client, tail, model or operator. */
  search: z.string().trim().min(1).max(200).optional(),
};

/**
 * `.strict()`, with no `sortBy`/`sortOrder`: a calendar has one order — the
 * order the legs fly — and a parameter it would silently ignore is a wrong
 * answer (AGENTS.md).
 */
export const queryScheduleSchema = paginationSchema
  .pick({ page: true, limit: true })
  .extend({
    ...filters,
    /** Inclusive, by the leg's departure day. At most 42 days apart. */
    from: calendarDate,
    to: calendarDate,
  })
  .strict()
  .refine((value) => value.from <= value.to, { message: '`from` must be on or before `to`', path: ['to'] })
  .refine((value) => windowDays(value.from, value.to) <= MAX_WINDOW_DAYS, {
    message: `Ask for at most ${MAX_WINDOW_DAYS} days at a time — the year view reads /schedule/calendar`,
    path: ['to'],
  });

export type QueryScheduleInput = z.infer<typeof queryScheduleSchema>;
export class QueryScheduleDto extends createZodDto(queryScheduleSchema) {}

export const scheduleStatsSchema = z
  .object({
    ...filters,
    /**
     * The day the tiles count as today — the browser's own date, so a desk in
     * New York at 9pm is not shown tomorrow's flights. Defaults to today in UTC.
     */
    on: calendarDate.optional(),
  })
  .strict();

export type ScheduleStatsInput = z.infer<typeof scheduleStatsSchema>;
export class ScheduleStatsDto extends createZodDto(scheduleStatsSchema) {}

export const scheduleCalendarSchema = z
  .object({
    ...filters,
    year: z.coerce.number().int().min(2000).max(2100),
  })
  .strict();

export type ScheduleCalendarInput = z.infer<typeof scheduleCalendarSchema>;
export class ScheduleCalendarDto extends createZodDto(scheduleCalendarSchema) {}
