import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { paginationSchema, sortableBy } from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { uploadUrl } from '../../../common/dto/uploads.js';
import { ItineraryStatus } from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. `departureDate` is the trip's own column,
 * special-cased in the service the same way Trips sorts by it. */
export const ITINERARY_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'status',
  'confirmedAt',
  'departureDate',
] as const;

export const queryItinerariesSchema = paginationSchema
  .extend({
    status: z.enum(ItineraryStatus).optional(),
    tripId: z.uuid().optional(),
    sortBy: sortableBy(ITINERARY_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryItinerariesInput = z.infer<typeof queryItinerariesSchema>;
export class QueryItinerariesDto extends createZodDto(queryItinerariesSchema) {}

/** "HH:MM", 24-hour, local at the destination — the same shape Trips' own
 * leg departure time uses, for the one arrival time this schema tracks. */
const clockTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:30');

/**
 * Building a document for a trip. Everything past `tripId` is content the
 * broker types or uploads — aircraft, operator, tail, route, dates and the
 * passenger manifest all come from the trip itself and are never accepted
 * here.
 */
export const createItinerarySchema = z.object({
  tripId: z.uuid('Choose the trip this document is for'),

  logoUrl: uploadUrl.optional(),

  arrivalTime: clockTime.optional(),
  flightTime: z.string().trim().max(20).optional(),
  miles: z.string().trim().max(20).optional(),

  /** Overrides the airport's own assigned FBO for this document only. */
  departureFbo: z.string().trim().max(200).optional(),
  arrivalFbo: z.string().trim().max(200).optional(),

  catering: z.string().trim().max(300).optional(),
  groundTransport: z.string().trim().max(300).optional(),

  operatorItineraryUrl: uploadUrl.optional(),
  operatorItineraryText: z.string().trim().max(5_000).optional(),

  exteriorImageUrl: uploadUrl.optional(),
  interiorImageUrl: uploadUrl.optional(),

  notes: z.string().trim().max(5_000).optional(),
});

export type CreateItineraryInput = z.infer<typeof createItinerarySchema>;
export class CreateItineraryDto extends createZodDto(createItinerarySchema) {}

/**
 * Editing a document. Every field optional, `null` clears — written out
 * rather than derived with `.partial()`, which would keep create's defaults
 * (AGENTS.md). `tripId` is not here: the document belongs to the trip it was
 * built for permanently, and a wrong pick is deleted and rebuilt rather than
 * repointed. `status` moves only through `POST /itineraries/:id/confirm`.
 */
export const updateItinerarySchema = z
  .object({
    logoUrl: uploadUrl.nullable().optional(),

    arrivalTime: clockTime.nullable().optional(),
    flightTime: z.string().trim().max(20).nullable().optional(),
    miles: z.string().trim().max(20).nullable().optional(),

    departureFbo: z.string().trim().max(200).nullable().optional(),
    arrivalFbo: z.string().trim().max(200).nullable().optional(),

    catering: z.string().trim().max(300).nullable().optional(),
    groundTransport: z.string().trim().max(300).nullable().optional(),

    operatorItineraryUrl: uploadUrl.nullable().optional(),
    operatorItineraryText: z.string().trim().max(5_000).nullable().optional(),

    exteriorImageUrl: uploadUrl.nullable().optional(),
    interiorImageUrl: uploadUrl.nullable().optional(),

    notes: z.string().trim().max(5_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateItineraryInput = z.infer<typeof updateItinerarySchema>;
export class UpdateItineraryDto extends createZodDto(updateItinerarySchema) {}
