import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { nullableNumber, optionalNumber } from '../../../common/dto/numbers.js';
import { AircraftCategory } from '../../../generated/prisma/enums.js';
import { paginationSchema } from '../../../common/dto/pagination.dto.js';

/** A category in the URL, case-sensitive like every enum on the wire. */
export const charterRateParamSchema = z.object({
  category: z.enum(AircraftCategory),
});
export class CharterRateParamDto extends createZodDto(charterRateParamSchema) {}

/**
 * Setting one category's rates. Every field optional, `null` clears — a PATCH
 * in all but verb (PUT because it creates the row the first time, and the
 * category is the natural key rather than an id nobody knows).
 *
 * The bounds catch a slipped keystroke, not the market: $100,000 an hour or
 * 800 knots is a typo on any business jet.
 */
export const setCharterRateSchema = z
  .object({
    hourlyRate: nullableNumber('The hourly rate must be a number of dollars', {
      min: 1,
      max: 100_000,
    }),
    averageSpeedKnots: nullableNumber('The average speed must be whole knots', {
      min: 50,
      max: 800,
      int: true,
    }),
    typicalSeats: nullableNumber('Seats must be a whole number', {
      min: 1,
      max: 100,
      int: true,
    }),
    minimumHours: nullableNumber('The minimum must be hours, like 1.5', {
      min: 0,
      max: 24,
    }),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to set',
  });

export type SetCharterRateInput = z.infer<typeof setCharterRateSchema>;
export class SetCharterRateDto extends createZodDto(setCharterRateSchema) {}

/**
 * The instant estimate: a route, a party size, and whether it comes back.
 * Nothing is saved.
 */
export const estimateSchema = z
  .object({
    originAirportId: z.uuid('Choose where the trip starts'),
    destinationAirportId: z.uuid('Choose where the trip goes'),
    passengers: optionalNumber('Passengers must be a whole number', {
      min: 1,
      max: 100,
      int: true,
    }),
    roundTrip: z.boolean().default(false),
  })
  .refine((value) => value.originAirportId !== value.destinationAirportId, {
    message: 'Origin and destination must be different airports',
    path: ['destinationAirportId'],
  });

export type EstimateInput = z.infer<typeof estimateSchema>;
export class EstimateDto extends createZodDto(estimateSchema) {}

/**
 * Paging for the rate table. There are only as many rows as aircraft
 * categories, but every list endpoint pages all the same, and the table has no
 * search — so the query is `.strict()`: a `?search=` would otherwise be
 * silently dropped and answered with the whole table (see AGENTS.md on
 * parameters an endpoint ignores).
 */
export const queryCharterRatesSchema = paginationSchema
  .pick({ page: true, limit: true })
  .strict();
export type QueryCharterRatesInput = z.infer<typeof queryCharterRatesSchema>;
export class QueryCharterRatesDto extends createZodDto(queryCharterRatesSchema) {}
