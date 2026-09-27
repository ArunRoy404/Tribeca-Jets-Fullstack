import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { money, optionalNumber } from '../../../common/dto/numbers.js';
import { uploadUrl } from '../../../common/dto/uploads.js';
import { AircraftCategory, ReferralStatus } from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const REFERRAL_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'reference',
  'departureDate',
  'status',
] as const;

export const queryReferralsSchema = paginationSchema
  .extend({
    status: z.enum(ReferralStatus).optional(),
    /** The desk's filter; a referral agent only ever sees their own. */
    agentId: z.uuid().optional(),
    assignedBrokerId: z.uuid().optional(),
    sortBy: sortableBy(REFERRAL_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryReferralsInput = z.infer<typeof queryReferralsSchema>;
export class QueryReferralsDto extends createZodDto(queryReferralsSchema) {}

/** "HH:MM", 24-hour, local at the origin. */
const departureTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:30');

/**
 * #11's Submit Referral form, field for field: client name, phone, email,
 * departure and arrival airports, departure/return dates, departure time,
 * passenger count, aircraft preference, approximate budget, notes, and
 * attachments.
 *
 * A way to reach the client is required — a referral the desk cannot contact
 * is one it cannot work. Everything about the trip itself is optional: an
 * agent often passes on a name before the client has settled a date.
 */
export const submitReferralSchema = z
  .object({
    clientFirstName: z.string().trim().min(1, "Enter the client's first name").max(100),
    clientLastName: z.string().trim().min(1, "Enter the client's last name").max(100),
    clientEmail: z.email('Enter a valid email address').toLowerCase().trim().optional(),
    clientPhone: z.string().trim().min(1).max(40).optional(),

    originAirportId: z.uuid().optional(),
    destinationAirportId: z.uuid().optional(),
    departureDate: calendarDate.optional(),
    returnDate: calendarDate.optional(),
    departureTime: departureTime.optional(),

    passengers: optionalNumber('Passengers must be a whole number', { min: 1, max: 500, int: true }),
    aircraftPreference: z.enum(AircraftCategory).optional(),
    budget: money('The budget must be an amount', { min: 1, max: 100_000_000 }).optional(),
    notes: z.string().trim().max(5_000).optional(),
    attachmentUrls: z.array(uploadUrl).max(10).default([]),

    /**
     * The agent it came from. A referral agent never sends it — it is their
     * own session. Desk staff logging a referral an agent phoned in must.
     */
    agentId: z.uuid().optional(),
  })
  .refine((value) => Boolean(value.clientEmail || value.clientPhone), {
    path: ['clientPhone'],
    message: 'Give a phone number or an email so the desk can reach the client',
  })
  .refine(
    (value) =>
      !value.originAirportId ||
      !value.destinationAirportId ||
      value.originAirportId !== value.destinationAirportId,
    { path: ['destinationAirportId'], message: 'Departure and arrival cannot be the same airport' },
  )
  .refine(
    (value) => !value.returnDate || !value.departureDate || value.returnDate >= value.departureDate,
    { path: ['returnDate'], message: 'The return cannot be before the departure' },
  );

export type SubmitReferralInput = z.infer<typeof submitReferralSchema>;
export class SubmitReferralDto extends createZodDto(submitReferralSchema) {}

/**
 * The desk working a referral. What the agent submitted is deliberately not
 * here: it is their record of what they sent, and the CRM client the desk
 * converted it into is where corrections belong.
 */
export const updateReferralSchema = z
  .object({
    status: z.enum(ReferralStatus).optional(),
    /** Null unassigns. Assigning anyone but yourself is an administrator's call. */
    assignedBrokerId: z.uuid().nullable().optional(),
    /**
     * The trip it booked. Must be one of the converted client's trips; setting
     * it moves the referral to BOOKED and raises the agent's commission from
     * their standing structure. Null unlinks (the commission is left alone —
     * withdrawing money owed is its own, deliberate act).
     */
    tripId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;
export class UpdateReferralDto extends createZodDto(updateReferralSchema) {}

/**
 * Turning a referral into the CRM's own records: a client and a trip request.
 * Send `clientId` when the client is already on file, and the referral links
 * to them instead of creating a duplicate.
 */
export const convertReferralSchema = z.object({
  clientId: z.uuid().optional(),
});

export type ConvertReferralInput = z.infer<typeof convertReferralSchema>;
export class ConvertReferralDto extends createZodDto(convertReferralSchema) {}

// ---- Resources ------------------------------------------------------------

export const queryResourcesSchema = paginationSchema
  .extend({ sortBy: sortableBy(['createdAt', 'updatedAt', 'title'] as const) })
  .merge(archiveQuerySchema);

export type QueryResourcesInput = z.infer<typeof queryResourcesSchema>;
export class QueryResourcesDto extends createZodDto(queryResourcesSchema) {}

export const createResourceSchema = z.object({
  title: z.string().trim().min(1, 'Give the resource a title').max(200),
  description: z.string().trim().max(1_000).optional(),
  /** A PUBLIC upload — agents must be able to open it. */
  fileUrl: uploadUrl,
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export class CreateResourceDto extends createZodDto(createResourceSchema) {}

export const updateResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1_000).nullable().optional(),
    fileUrl: uploadUrl.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export class UpdateResourceDto extends createZodDto(updateResourceSchema) {}
