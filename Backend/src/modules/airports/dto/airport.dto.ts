import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  nullableNumber,
  requiredNumber,
} from '../../../common/dto/numbers.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const AIRPORT_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'icao',
  'iata',
  'name',
  'city',
  'country',
  'longestRunwayFt',
] as const;

/**
 * ICAO is four letters, IATA is three, and both are upper-case everywhere in
 * aviation. Normalising on the way in rather than at each call site is what
 * stops `kteb` and `KTEB` becoming two airports — the unique index can only
 * enforce that if the value reaching it is already canonical.
 */
const icaoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}$/, 'ICAO must be 4 letters or digits, e.g. KTEB');

const iataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3}$/, 'IATA must be 3 letters or digits, e.g. TEB');

/**
 * Coordinates arrive as strings from the form and are stored as decimals.
 * Bounded because a longitude of 400 is not a slow query, it is a map pin in
 * the wrong hemisphere that nothing downstream will question.
 *
 * Built with `requiredNumber` rather than `z.coerce.number()`: an empty form
 * field sends `""`, and `Number('')` is 0 — a valid-looking coordinate in the
 * Gulf of Guinea that nothing downstream could tell from a real one.
 */
const LATITUDE = { min: -90, max: 90 };
const LONGITUDE = { min: -180, max: 180 };
const RUNWAY = { min: 0, max: 30_000, int: true };

export const queryAirportsSchema = paginationSchema
  .extend({
    /** Exact match on the stored country name. Omit for all countries. */
    country: z.string().trim().min(1).max(100).optional(),
    sortBy: sortableBy(AIRPORT_SORTABLE_FIELDS),
  })
  // `archived` replaces the old `includeDeleted`, which used
  // `z.coerce.boolean()` — and `Boolean("false")` is `true`, so asking to
  // exclude removed rows quietly included them.
  .merge(archiveQuerySchema);

export type QueryAirportsInput = z.infer<typeof queryAirportsSchema>;
export class QueryAirportsDto extends createZodDto(queryAirportsSchema) {}

export const createAirportSchema = z.object({
  icao: icaoSchema,
  iata: iataSchema.optional(),
  name: z.string().trim().min(1, 'Airport name is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(120),
  state: z.string().trim().max(60).optional(),
  country: z.string().trim().min(1, 'Country is required').max(100),
  /**
   * Required: a charter desk cannot place an aircraft without coordinates and
   * a runway length. `iata`, `state` and `assignedFbo` stay optional — many
   * airports genuinely have no IATA code, most countries have no state, and
   * the "with assigned FBO" stat only means something if an FBO can be absent.
   */
  latitude: requiredNumber('Latitude is required', LATITUDE),
  longitude: requiredNumber('Longitude is required', LONGITUDE),
  longestRunwayFt: requiredNumber('Longest runway is required', RUNWAY),
  assignedFbo: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export type CreateAirportInput = z.infer<typeof createAirportSchema>;
export class CreateAirportDto extends createZodDto(createAirportSchema) {}

/**
 * Every field optional — this is a PATCH.
 *
 * `icao` is included: unlike a user's email it is a correctable data-entry
 * mistake, not an identity, and nothing yet references the code as a foreign
 * key. Nullable fields accept `null` so the form can clear them.
 */
export const updateAirportSchema = z
  .object({
    icao: icaoSchema.optional(),
    iata: iataSchema.nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    state: z.string().trim().max(60).nullable().optional(),
    country: z.string().trim().min(1).max(100).optional(),
    latitude: nullableNumber('Latitude must be between -90 and 90', LATITUDE),
    longitude: nullableNumber('Longitude must be between -180 and 180', LONGITUDE),
    longestRunwayFt: nullableNumber('Runway length must be in feet', RUNWAY),
    assignedFbo: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateAirportInput = z.infer<typeof updateAirportSchema>;
export class UpdateAirportDto extends createZodDto(updateAirportSchema) {}
