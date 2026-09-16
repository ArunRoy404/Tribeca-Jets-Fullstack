import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  nullableNumber,
  optionalNumber,
} from '../../../common/dto/numbers.js';
import {
  AircraftCategory,
  LeadSource,
  TripRequestStatus,
} from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const TRIP_REQUEST_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'departureDate',
  'status',
  'estimatedValue',
  'passengers',
] as const;

/**
 * Bounds that exist to catch a typo, not to model charter.
 *
 * A 500-seat request or a $900m estimate is a slipped keystroke, and storing
 * it silently puts a wrong number into the pipeline total the desk reports on.
 */
const PASSENGERS = { min: 1, max: 200, int: true };
const ESTIMATE = { min: 0, max: 100_000_000 };

/**
 * A date the desk picks from a calendar, with no time of day.
 *
 * Accepts `YYYY-MM-DD` and stores midnight UTC against a `DATE` column, so it
 * comes back as the day that was typed rather than shifting for whoever reads
 * it. Same treatment as the aircraft maintenance dates.
 */
const calendarDate = z.iso
  .date('Use a YYYY-MM-DD date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

/** Windows the Open Requests board filters by. */
export const REQUEST_WINDOWS = ['OVERDUE', 'TODAY', 'UPCOMING'] as const;
export type RequestWindow = (typeof REQUEST_WINDOWS)[number];

export const queryTripRequestsSchema = paginationSchema
  .extend({
    status: z.enum(TripRequestStatus).optional(),
    source: z.enum(LeadSource).optional(),
    aircraftPreference: z.enum(AircraftCategory).optional(),
    clientId: z.uuid().optional(),
    assignedBrokerId: z.uuid().optional(),
    originAirportId: z.uuid().optional(),
    destinationAirportId: z.uuid().optional(),
    /** Departure relative to today: OVERDUE, TODAY or UPCOMING. */
    departure: z.enum(REQUEST_WINDOWS).optional(),
    /**
     * `true` hides requests that are finished either way.
     *
     * The Open Requests board (scope §6.4) is a working list, not an archive:
     * a request that converted or was lost is history, and leaving it there
     * buries the three that still need a price.
     */
    openOnly: z.stringbool().default(false),
    sortBy: sortableBy(TRIP_REQUEST_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryTripRequestsInput = z.infer<typeof queryTripRequestsSchema>;
export class QueryTripRequestsDto extends createZodDto(
  queryTripRequestsSchema,
) {}

export const createTripRequestSchema = z
  .object({
    /**
     * The only required field. An enquiry with nobody attached cannot be
     * followed up, quoted or converted — everything else can arrive later,
     * and demanding a full route on a first phone call only produces guesses.
     */
    clientId: z.uuid('Choose who this request is for'),

    source: z.enum(LeadSource).default(LeadSource.DIRECT),
    status: z.enum(TripRequestStatus).default(TripRequestStatus.OPEN),
    assignedBrokerId: z.uuid().nullable().optional(),

    originAirportId: z.uuid().nullable().optional(),
    destinationAirportId: z.uuid().nullable().optional(),

    departureDate: calendarDate.optional(),
    returnDate: calendarDate.optional(),

    passengers: optionalNumber('Passengers must be a whole number', PASSENGERS),
    aircraftPreference: z.enum(AircraftCategory).optional(),
    estimatedValue: optionalNumber(
      'Estimated value must be a number',
      ESTIMATE,
    ),

    summary: z.string().trim().max(300).optional(),
    requirements: z.string().trim().max(2_000).optional(),
    internalNotes: z.string().trim().max(2_000).optional(),
  })
  .refine(
    (value) =>
      !value.returnDate ||
      !value.departureDate ||
      value.returnDate >= value.departureDate,
    {
      // Caught here rather than in the database: a return before departure is
      // always a typo, and the form should say which field is wrong.
      path: ['returnDate'],
      message: 'The return date cannot be before the departure date',
    },
  );

export type CreateTripRequestInput = z.infer<typeof createTripRequestSchema>;
export class CreateTripRequestDto extends createZodDto(
  createTripRequestSchema,
) {}

/** Every field optional — this is a PATCH. `null` clears; omitted leaves alone. */
export const updateTripRequestSchema = z
  .object({
    clientId: z.uuid().optional(),
    source: z.enum(LeadSource).optional(),
    status: z.enum(TripRequestStatus).optional(),
    assignedBrokerId: z.uuid().nullable().optional(),

    originAirportId: z.uuid().nullable().optional(),
    destinationAirportId: z.uuid().nullable().optional(),

    departureDate: calendarDate.nullable().optional(),
    returnDate: calendarDate.nullable().optional(),

    passengers: nullableNumber('Passengers must be a whole number', PASSENGERS),
    aircraftPreference: z.enum(AircraftCategory).nullable().optional(),
    estimatedValue: nullableNumber('Estimated value must be a number', ESTIMATE),

    summary: z.string().trim().max(300).nullable().optional(),
    requirements: z.string().trim().max(2_000).nullable().optional(),
    internalNotes: z.string().trim().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })
  .refine(
    (value) =>
      !value.returnDate ||
      !value.departureDate ||
      value.returnDate >= value.departureDate,
    {
      path: ['returnDate'],
      message: 'The return date cannot be before the departure date',
    },
  );

export type UpdateTripRequestInput = z.infer<typeof updateTripRequestSchema>;
export class UpdateTripRequestDto extends createZodDto(
  updateTripRequestSchema,
) {}
