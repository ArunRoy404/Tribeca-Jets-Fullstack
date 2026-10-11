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
  OperatorStatus,
  PaymentTerms,
  ResponseSpeed,
} from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const OPERATOR_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'status',
  'reliabilityRating',
  'safetyRating',
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

/** Required on create, so an edit may change them but never clear them. */
const keptText = (message: string, max: number) => z.string().trim().min(1, message).max(max);

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
  homeBase: keptText('Home base is required', 120),
  primaryContact: keptText('A named contact is required', 120),
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
  /**
   * The desk's safety rating, 0–5 like reliability (owner's decision,
   * 8 Oct 2026). Blank means "not rated" — never defaulted.
   */
  safetyRating: optionalNumber('Safety must be between 0 and 5', RATING),
  /** The desk's judgment: FAST, AVERAGE or SLOW. */
  responseSpeed: z.enum(ResponseSpeed).optional(),

  /**
   * Pasted verbatim from the operator's own terms, so it is a block of text
   * rather than a phrase — a tiered policy runs to a paragraph per band plus a
   * force-majeure clause. Sized like a quote's `terms` for that reason, not
   * like `paymentTerms`, which really is "Net 30".
   */
  cancellationPolicy: z.string().trim().max(5_000).optional(),
  /** PREPAID, DUE_ON_RECEIPT, NET_7, NET_15 or NET_30. */
  paymentTerms: z.enum(PaymentTerms).optional(),
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
    // Home base, contact name and email are required on create: changed, never cleared.
    homeBase: keptText('Home base is required', 120).optional(),
    website: z.string().trim().max(200).nullable().optional(),

    generalEmail: z.email().toLowerCase().trim().nullable().optional(),
    generalPhone: z.string().trim().max(40).nullable().optional(),
    primaryContact: keptText('A named contact is required', 120).optional(),
    contactEmail: z.email('A valid contact email is required').toLowerCase().trim().optional(),
    contactPhone: z.string().trim().max(40).nullable().optional(),

    aircraftTypes: chipList(40).optional(),
    serviceRoutes: chipList(40).optional(),

    reliabilityRating: nullableNumber('Reliability must be between 0 and 5', RATING),
    safetyRating: nullableNumber('Safety must be between 0 and 5', RATING),
    responseSpeed: z.enum(ResponseSpeed).nullable().optional(),

    cancellationPolicy: z.string().trim().max(5_000).nullable().optional(),
    paymentTerms: z.enum(PaymentTerms).nullable().optional(),
    sourcingNotes: z.string().trim().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
export class UpdateOperatorDto extends createZodDto(updateOperatorSchema) {}
