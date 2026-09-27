import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate, timestamp } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  nullableNumber,
  optionalNumber,
} from '../../../common/dto/numbers.js';
import { EmptyLegStatus } from '../../../generated/prisma/enums.js';
import { MONEY } from '../../quotes/dto/quote.dto.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const EMPTY_LEG_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'reference',
  'departureDate',
  'expiresAt',
  'price',
] as const;

export const queryEmptyLegsSchema = paginationSchema
  .extend({
    /**
     * As the desk reads it: `EXPIRED` includes open legs whose offer has
     * lapsed, and `AVAILABLE` / `MATCHED` exclude them.
     */
    status: z.enum(EmptyLegStatus).optional(),
    originAirportId: z.uuid().optional(),
    destinationAirportId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    sortBy: sortableBy(EMPTY_LEG_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryEmptyLegsInput = z.infer<typeof queryEmptyLegsSchema>;
export class QueryEmptyLegsDto extends createZodDto(queryEmptyLegsSchema) {}

/** "HH:MM", 24-hour, local at the origin — the trip leg's format. */
const departureTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:30');

const SEATS = { min: 1, max: 500, int: true };

export const createEmptyLegSchema = z
  .object({
    originAirportId: z.uuid('Choose where it departs'),
    destinationAirportId: z.uuid('Choose where it arrives'),
    departureDate: calendarDate,
    departureTime: departureTime.optional(),
    expiresAt: timestamp.optional(),

    operatorId: z.uuid().optional(),
    aircraftId: z.uuid().optional(),
    aircraftDescription: z.string().trim().max(200).optional(),
    seats: optionalNumber('Seats must be a whole number', SEATS),
    price: optionalNumber('The price must be a number', MONEY),

    /** AVAILABLE unless the desk is entering one already spoken for. */
    status: z.enum(EmptyLegStatus).default(EmptyLegStatus.AVAILABLE),
    notes: z.string().trim().max(5_000).optional(),
  })
  .refine((value) => value.originAirportId !== value.destinationAirportId, {
    path: ['destinationAirportId'],
    message: 'An empty leg cannot depart and arrive at the same airport',
  });

export type CreateEmptyLegInput = z.infer<typeof createEmptyLegSchema>;
export class CreateEmptyLegDto extends createZodDto(createEmptyLegSchema) {}

/**
 * Written out rather than `.partial()` — `.partial()` keeps the create
 * default and would reset every edited leg to AVAILABLE (AGENTS.md).
 */
export const updateEmptyLegSchema = z
  .object({
    originAirportId: z.uuid().optional(),
    destinationAirportId: z.uuid().optional(),
    departureDate: calendarDate.optional(),
    departureTime: departureTime.nullable().optional(),
    expiresAt: timestamp.nullable().optional(),

    operatorId: z.uuid().nullable().optional(),
    aircraftId: z.uuid().nullable().optional(),
    aircraftDescription: z.string().trim().max(200).nullable().optional(),
    seats: nullableNumber('Seats must be a whole number', SEATS),
    price: nullableNumber('The price must be a number', MONEY),

    status: z.enum(EmptyLegStatus).optional(),
    notes: z.string().trim().max(5_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateEmptyLegInput = z.infer<typeof updateEmptyLegSchema>;
export class UpdateEmptyLegDto extends createZodDto(updateEmptyLegSchema) {}
