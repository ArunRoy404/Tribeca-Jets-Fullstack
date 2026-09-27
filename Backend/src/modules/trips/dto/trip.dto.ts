import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  nullableNumber,
  optionalNumber,
} from '../../../common/dto/numbers.js';
import { uploadUrl } from '../../../common/dto/uploads.js';
import { TripStatus, TripType } from '../../../generated/prisma/enums.js';
import { FET_RATE, MONEY, lineItemList } from '../../quotes/dto/quote.dto.js';
import { CREATABLE_STATUSES } from '../trips.lifecycle.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const TRIP_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'reference',
  'departureDate',
  'status',
] as const;

/** Departure relative to today, the trips board's quick filter. */
export const TRIP_WINDOWS = ['PAST', 'TODAY', 'UPCOMING'] as const;
export type TripWindow = (typeof TRIP_WINDOWS)[number];

export const queryTripsSchema = paginationSchema
  .extend({
    status: z.enum(TripStatus).optional(),
    type: z.enum(TripType).optional(),
    clientId: z.uuid().optional(),
    assignedBrokerId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    aircraftId: z.uuid().optional(),
    /** Departure relative to today: PAST, TODAY or UPCOMING. */
    departure: z.enum(TRIP_WINDOWS).optional(),
    /**
     * `true` keeps only trips still ahead of the desk — not completed, not
     * cancelled. The board is a working list.
     */
    activeOnly: z.stringbool().default(false),
    sortBy: sortableBy(TRIP_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryTripsInput = z.infer<typeof queryTripsSchema>;
export class QueryTripsDto extends createZodDto(queryTripsSchema) {}

/** "HH:MM", 24-hour, local at the origin. */
const departureTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:30');

/**
 * One leg. `id` is sent back on edit so an unchanged leg keeps its row (and
 * its history); a leg without one is new, and a stored leg missing from the
 * list is archived.
 */
const legSchema = z.object({
  id: z.uuid().optional(),
  originAirportId: z.uuid('Choose where this leg departs'),
  destinationAirportId: z.uuid('Choose where this leg arrives'),
  departureDate: calendarDate.nullable().optional(),
  departureTime: departureTime.nullable().optional(),
});
export type LegInput = z.infer<typeof legSchema>;

const passengerSchema = z.object({
  id: z.uuid().optional(),
  fullName: z.string().trim().min(1, 'Every named passenger needs a name').max(200),
  dateOfBirth: calendarDate.nullable().optional(),
  passportNumber: z.string().trim().max(40).nullable().optional(),
});
export type PassengerInput = z.infer<typeof passengerSchema>;

const PASSENGERS = { min: 1, max: 200, int: true };

/**
 * Booking a trip by hand. Most trips are booked from an approved quote
 * instead (`POST /trips/from-quote/:quoteId`), which fills all of this in.
 *
 * `status` may only be DRAFT, BOOKED or CONFIRMED here — a trip is not
 * created in flight, completed, or already cancelled.
 */
export const createTripSchema = z.object({
  clientId: z.uuid('Choose who the trip is for'),
  assignedBrokerId: z.uuid().nullable().optional(),
  tripRequestId: z.uuid().nullable().optional(),

  operatorId: z.uuid().nullable().optional(),
  aircraftId: z.uuid().nullable().optional(),
  aircraftDescription: z.string().trim().max(200).nullable().optional(),

  type: z.enum(TripType).default(TripType.ONE_WAY),
  status: z.enum(CREATABLE_STATUSES).default(TripStatus.DRAFT),
  operatorConfirmed: z.boolean().default(false),

  passengerCount: optionalNumber('Passengers must be a whole number', PASSENGERS),

  legs: z.array(legSchema).min(1, 'A trip needs at least one leg').max(20),
  passengers: z.array(passengerSchema).max(200).default([]),

  basePrice: optionalNumber('The price must be a number', MONEY),
  fetEnabled: z.boolean().default(true),
  fetRate: optionalNumber('The FET rate must be a number like 0.075', FET_RATE),
  operatorCost: optionalNumber('The operator cost must be a number', MONEY),
  lineItems: lineItemList.optional(),

  internalNotes: z.string().trim().max(5_000).optional(),
  clientNotes: z.string().trim().max(5_000).optional(),
  documentUrls: z.array(uploadUrl).max(30).default([]),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export class CreateTripDto extends createZodDto(createTripSchema) {}

/**
 * Editing a trip. Every field optional, `null` clears — written out rather
 * than derived with `.partial()`, which would keep the create defaults and
 * silently reset `type` and `fetEnabled` on every small edit (AGENTS.md).
 *
 * `legs` and `passengers`, when sent, are the complete new lists. `status` is
 * not here: it moves through `POST /trips/:id/status`, which knows the
 * allowed transitions.
 */
export const updateTripSchema = z
  .object({
    clientId: z.uuid().optional(),
    assignedBrokerId: z.uuid().nullable().optional(),
    tripRequestId: z.uuid().nullable().optional(),

    operatorId: z.uuid().nullable().optional(),
    aircraftId: z.uuid().nullable().optional(),
    aircraftDescription: z.string().trim().max(200).nullable().optional(),

    type: z.enum(TripType).optional(),
    operatorConfirmed: z.boolean().optional(),

    passengerCount: nullableNumber('Passengers must be a whole number', PASSENGERS),

    legs: z.array(legSchema).min(1).max(20).optional(),
    passengers: z.array(passengerSchema).max(200).optional(),

    basePrice: nullableNumber('The price must be a number', MONEY),
    fetEnabled: z.boolean().optional(),
    fetRate: optionalNumber('The FET rate must be a number like 0.075', FET_RATE),
    operatorCost: nullableNumber('The operator cost must be a number', MONEY),
    lineItems: lineItemList.optional(),

    internalNotes: z.string().trim().max(5_000).nullable().optional(),
    clientNotes: z.string().trim().max(5_000).nullable().optional(),
    documentUrls: z.array(uploadUrl).max(30).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export class UpdateTripDto extends createZodDto(updateTripSchema) {}

export const changeTripStatusSchema = z.object({
  status: z.enum(TripStatus),
  /** Why — lands in the audit log and so on the trip's timeline. */
  note: z.string().trim().max(500).optional(),
});
export type ChangeTripStatusInput = z.infer<typeof changeTripStatusSchema>;
export class ChangeTripStatusDto extends createZodDto(changeTripStatusSchema) {}

/** Booking an approved quote. Everything else is copied from the quote. */
export const bookQuoteSchema = z.object({
  status: z.enum(CREATABLE_STATUSES).default(TripStatus.BOOKED),
});
export type BookQuoteInput = z.infer<typeof bookQuoteSchema>;
export class BookQuoteDto extends createZodDto(bookQuoteSchema) {}
