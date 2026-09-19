import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate, timestamp } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  ClientPriority,
  ClientStatus,
  ClientType,
  FollowUpMethod,
  LeadSource,
  LeadStage,
} from '../../../generated/prisma/enums.js';

/**
 * Travel preferences. Kept permissive on purpose — the scope lists these as an
 * open set, and a preference only earns a real column once it gains business
 * rules (e.g. something the matching engine filters on).
 */
const preferencesSchema = z
  .object({
    pets: z.boolean().optional(),
    children: z.boolean().optional(),
    catering: z.string().max(500).optional(),
    beverages: z.string().max(500).optional(),
    noRedEye: z.boolean().optional(),
    wifiRequired: z.boolean().optional(),
    flightAttendant: z.boolean().optional(),
    oversizedBaggage: z.string().max(500).optional(),
    preferredFbo: z.string().max(200).optional(),
    groundTransport: z.string().max(500).optional(),
    hotel: z.string().max(500).optional(),
    preferredAirports: z.array(z.string().max(10)).max(50).optional(),
    preferredOperators: z.array(z.string().max(120)).max(50).optional(),
  })
  .catchall(z.unknown());

/**
 * Plain object shape, kept separate from the refined create schema so the
 * update schema can derive from it. In Zod 4 `.refine()` returns the same
 * object type rather than a wrapper, so there is no inner type to unwrap.
 */
const clientBaseSchema = z.object({
  type: z.enum(ClientType).default(ClientType.DIRECT),
  /** Where the relationship stands. Distinct from `leadStage`, the deal. */
  status: z.enum(ClientStatus).default(ClientStatus.LEAD),
  companyName: z.string().trim().max(200).optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.email().toLowerCase().trim().optional(),
  phone: z.string().trim().max(40).optional(),
  birthday: calendarDate.optional(),
  /**
   * The airport's id, not its ICAO. Airports are their own module now, and a
   * code typed into a text box is how you end up with a home airport that
   * matches nothing. The service checks the row exists before storing it.
   */
  homeAirportId: z.uuid().nullable().optional(),
  leadSource: z.enum(LeadSource).default(LeadSource.DIRECT),
  leadStage: z.enum(LeadStage).default(LeadStage.NEW),
  assignedBrokerId: z.uuid().optional(),
  originatingBrokerId: z.uuid().optional(),
  preferences: preferencesSchema.default({}),
  /**
   * How urgently the desk is working this lead — a separate axis from
   * `leadStage`. A brand-new enquiry can be the most important thing on the
   * desk, and a long-negotiated one routine.
   */
  priority: z.enum(ClientPriority).default(ClientPriority.MEDIUM),
  /**
   * How the next follow-up should happen. Nullable because it is genuinely
   * unknown until somebody decides — never defaulted to CALL, which would put
   * a method on the reminder that nobody chose.
   */
  followUpMethod: z.enum(FollowUpMethod).nullable().optional(),
  /** Nullable so the form can clear a scheduled follow-up. */
  nextFollowUpAt: timestamp.nullable().optional(),
  followUpNote: z.string().trim().max(1_000).nullable().optional(),
  notes: z.string().max(5_000).optional(),
  labels: z.array(z.string().trim().max(50)).max(25).default([]),
});

export const createClientSchema = clientBaseSchema.refine(
  (v) => v.type !== ClientType.TRAVEL_AGENT || Boolean(v.companyName),
  { path: ['companyName'], message: 'Company name is required for travel agents' },
);

export type CreateClientInput = z.infer<typeof createClientSchema>;
export class CreateClientDto extends createZodDto(createClientSchema) {}

/**
 * Every field optional, written out rather than derived with `.partial()`.
 *
 * This is not stylistic. **`.partial()` does not remove `.default()`** — it
 * makes a field optional on the way in and then fills the default on the way
 * out, so every absent defaulted field arrived at the service with a value.
 * `PATCH { phone }` parsed to `{ phone, type: DIRECT, status: LEAD, leadSource:
 * DIRECT, leadStage: NEW, priority: MEDIUM, labels: [], preferences: {} }`, and
 * the service wrote all of it: scheduling a follow-up demoted a VIP travel
 * agent to a brand-new direct lead and erased their labels and travel
 * preferences. Nothing in the UI revealed it, because the edit form happens to
 * post every one of those fields — only the small single-purpose dialogs
 * (follow-up, convert, assign broker) triggered it.
 *
 * Aircraft, Operators, Airports, Users and Trip Requests all spell their update
 * schemas out for this reason. Clients was the one that did not.
 *
 * The create refinement is intentionally not reused: a partial update has no
 * complete object to validate "travel agents need a company name" against.
 *
 * `originatingBrokerId` is absent by design — attribution is set once, at
 * creation, and never rewritten.
 */
export const updateClientSchema = z.object({
  type: z.enum(ClientType).optional(),
  status: z.enum(ClientStatus).optional(),
  companyName: z.string().trim().max(200).optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100).optional(),
  email: z.email().toLowerCase().trim().optional(),
  phone: z.string().trim().max(40).optional(),
  birthday: calendarDate.optional(),
  homeAirportId: z.uuid().nullable().optional(),
  leadSource: z.enum(LeadSource).optional(),
  leadStage: z.enum(LeadStage).optional(),
  assignedBrokerId: z.uuid().optional(),
  /** Replaced wholesale when sent, left untouched when absent. */
  preferences: preferencesSchema.optional(),
  priority: z.enum(ClientPriority).optional(),
  followUpMethod: z.enum(FollowUpMethod).nullable().optional(),
  /** Nullable so the form can clear a scheduled follow-up. */
  nextFollowUpAt: timestamp.nullable().optional(),
  followUpNote: z.string().trim().max(1_000).nullable().optional(),
  notes: z.string().max(5_000).optional(),
  labels: z.array(z.string().trim().max(50)).max(25).optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export class UpdateClientDto extends createZodDto(updateClientSchema) {}

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const CLIENT_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'lastName',
  'firstName',
  'leadStage',
  'status',
  'nextFollowUpAt',
] as const;

/**
 * The follow-up filter the table offers. Resolved against "now" in the service
 * rather than here, so every request is judged against the current clock and
 * not whenever the schema happened to be built.
 */
export const FOLLOW_UP_WINDOWS = ['OVERDUE', 'TODAY', 'UPCOMING'] as const;

export const queryClientsSchema = paginationSchema
  .extend({
    sortBy: sortableBy(CLIENT_SORTABLE_FIELDS),
    type: z.enum(ClientType).optional(),
    status: z.enum(ClientStatus).optional(),
    followUp: z.enum(FOLLOW_UP_WINDOWS).optional(),
    leadStage: z.enum(LeadStage).optional(),
    leadSource: z.enum(LeadSource).optional(),
    /** How urgently the desk is working this lead. */
    priority: z.enum(ClientPriority).optional(),
    assignedBrokerId: z.uuid().optional(),
    label: z.string().max(50).optional(),
  })
  .merge(archiveQuerySchema);

export type QueryClientsInput = z.infer<typeof queryClientsSchema>;
export class QueryClientsDto extends createZodDto(queryClientsSchema) {}
