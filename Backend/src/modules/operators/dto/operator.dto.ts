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
import { OperatorStatus } from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const OPERATOR_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'status',
  'reliabilityRating',
] as const;

/**
 * Chips on the operator card: fleet types and the routes they serve.
 *
 * Capped in both directions. Without a length cap a single request could store
 * a megabyte of text in an array column, and without an item cap the card
 * renders a wall of chips that pushes the rest of the row off screen.
 */
const RATING = { min: 0, max: 5 };

const chipList = (max: number) =>
  z.array(z.string().trim().min(1).max(80)).max(max);

export const queryOperatorsSchema = paginationSchema
  .extend({
    /** Filter to one status. Omit for all. */
    status: z.enum(OperatorStatus).optional(),
    sortBy: sortableBy(OPERATOR_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryOperatorsInput = z.infer<typeof queryOperatorsSchema>;
export class QueryOperatorsDto extends createZodDto(queryOperatorsSchema) {}

export const createOperatorSchema = z.object({
  name: z.string().trim().min(1, 'Operator name is required').max(200),
  status: z.enum(OperatorStatus).default(OperatorStatus.ACTIVE),
  /**
   * Required: you cannot source from an operator you cannot reach, and the
   * table's Operator and Contact columns are empty without them.
   *
   * Everything below stays optional — a fleet is rarely catalogued the day an
   * operator is added, and forcing a rating or a policy just produces a guess.
   */
  homeBase: z.string().trim().min(1, 'Home base is required').max(120),
  primaryContact: z
    .string()
    .trim()
    .min(1, 'A named contact is required')
    .max(120),
  contactEmail: z.email('A valid contact email is required').toLowerCase().trim(),

  website: z.string().trim().max(200).optional(),
  generalEmail: z.email().toLowerCase().trim().optional(),
  generalPhone: z.string().trim().max(40).optional(),
  contactPhone: z.string().trim().max(40).optional(),

  aircraftTypes: chipList(40).default([]),
  serviceRoutes: chipList(40).default([]),

  /**
   * Out of 5, as the operator card renders it. Optional, and blank means
   * "not rated" — `z.coerce.number()` would turn an empty field into 0, which
   * reads as the worst possible operator rather than an unrated one.
   */
  reliabilityRating: optionalNumber('Reliability must be between 0 and 5', RATING),
  /** A certification, not a number: "ARG/US Platinum". */
  safetyRating: z.string().trim().max(120).optional(),
  responseSpeed: z.string().trim().max(60).optional(),

  /**
   * Pasted verbatim from the operator's own terms, so it is a block of text
   * rather than a phrase — a tiered policy runs to a paragraph per band plus a
   * force-majeure clause. Sized like a quote's `terms` for that reason, not
   * like `paymentTerms`, which really is "Net 30".
   */
  cancellationPolicy: z.string().trim().max(5_000).optional(),
  paymentTerms: z.string().trim().max(120).optional(),
  sourcingNotes: z.string().trim().max(2_000).optional(),
});

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;
export class CreateOperatorDto extends createZodDto(createOperatorSchema) {}

/**
 * Every field optional — this is a PATCH.
 *
 * Arrays are replaced wholesale rather than merged: the UI edits them as one
 * comma-separated field, so "what the user typed" is the complete list, and a
 * merge would make a removed chip impossible to remove.
 */
export const updateOperatorSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    status: z.enum(OperatorStatus).optional(),
    homeBase: z.string().trim().max(120).nullable().optional(),
    website: z.string().trim().max(200).nullable().optional(),

    generalEmail: z.email().toLowerCase().trim().nullable().optional(),
    generalPhone: z.string().trim().max(40).nullable().optional(),
    primaryContact: z.string().trim().max(120).nullable().optional(),
    contactEmail: z.email().toLowerCase().trim().nullable().optional(),
    contactPhone: z.string().trim().max(40).nullable().optional(),

    aircraftTypes: chipList(40).optional(),
    serviceRoutes: chipList(40).optional(),

    reliabilityRating: nullableNumber('Reliability must be between 0 and 5', RATING),
    safetyRating: z.string().trim().max(120).nullable().optional(),
    responseSpeed: z.string().trim().max(60).nullable().optional(),

    cancellationPolicy: z.string().trim().max(5_000).nullable().optional(),
    paymentTerms: z.string().trim().max(120).nullable().optional(),
    sourcingNotes: z.string().trim().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
export class UpdateOperatorDto extends createZodDto(updateOperatorSchema) {}
