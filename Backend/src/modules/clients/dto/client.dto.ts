import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import {
  ClientType,
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
  companyName: z.string().trim().max(200).optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.email().toLowerCase().trim().optional(),
  phone: z.string().trim().max(40).optional(),
  birthday: z.coerce.date().optional(),
  homeAirport: z.string().trim().max(10).optional(),
  leadSource: z.enum(LeadSource).default(LeadSource.DIRECT),
  leadStage: z.enum(LeadStage).default(LeadStage.NEW),
  assignedBrokerId: z.uuid().optional(),
  originatingBrokerId: z.uuid().optional(),
  preferences: preferencesSchema.default({}),
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
 * Every field optional, and the create refinement is intentionally not reused:
 * a partial update has no complete object to validate that rule against.
 */
export const updateClientSchema = clientBaseSchema
  .partial()
  .omit({ originatingBrokerId: true }); // Attribution is set once, at creation.

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export class UpdateClientDto extends createZodDto(updateClientSchema) {}

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const CLIENT_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'lastName',
  'firstName',
  'leadStage',
] as const;

export const queryClientsSchema = paginationSchema.extend({
  sortBy: sortableBy(CLIENT_SORTABLE_FIELDS),
  type: z.enum(ClientType).optional(),
  leadStage: z.enum(LeadStage).optional(),
  leadSource: z.enum(LeadSource).optional(),
  assignedBrokerId: z.uuid().optional(),
  label: z.string().max(50).optional(),
});

export type QueryClientsInput = z.infer<typeof queryClientsSchema>;
export class QueryClientsDto extends createZodDto(queryClientsSchema) {}
