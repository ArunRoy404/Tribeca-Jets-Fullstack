import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { optionalNumber, nullableNumber } from '../../../common/dto/numbers.js';
import { OperatorQuoteStatus } from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const OPERATOR_QUOTE_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'requestedAt',
  'respondedAt',
  'price',
  'status',
] as const;

/**
 * A charter price, bounded to catch a slipped keystroke rather than to model
 * the market. $0 is a real quote — an operator can waive a positioning leg —
 * so the floor is 0 and not 1.
 */
const PRICE = { min: 0, max: 100_000_000 };

/** Chips, same shape and limits as `Aircraft.amenities`. */
const amenityList = z
  .array(z.string().trim().min(1).max(60))
  .max(30, 'That is more amenities than a quote can carry')
  .transform((values) => [...new Set(values.map((v) => v.trim()))]);

export const queryOperatorQuotesSchema = paginationSchema
  .extend({
    /** Every quote on one enquiry — how the comparison view loads. */
    tripRequestId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    aircraftId: z.uuid().optional(),
    status: z.enum(OperatorQuoteStatus).optional(),
    /**
     * `true` hides quotes that are settled either way.
     *
     * The sourcing board is a working list: an approved or rejected quote is
     * history, and leaving it in buries the one still waiting on an answer.
     */
    openOnly: z.stringbool().default(false),
    sortBy: sortableBy(OPERATOR_QUOTE_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryOperatorQuotesInput = z.infer<
  typeof queryOperatorQuotesSchema
>;
export class QueryOperatorQuotesDto extends createZodDto(
  queryOperatorQuotesSchema,
) {}

/**
 * Sending a request to an operator.
 *
 * This is the ask, not the answer: it carries who we are asking and what we
 * asked for, and the row starts at AWAITING_RESPONSE with no price. A quote
 * created with a price already on it is a response recorded in one step, which
 * is why `price` is accepted here too — a broker on the phone gets the number
 * before the request is written down, and forcing two calls would make the
 * response time a lie.
 */
export const createOperatorQuoteSchema = z.object({
  tripRequestId: z.uuid('Choose which request this is for'),
  operatorId: z.uuid('Choose an operator to ask'),

  /** What we asked for, in the broker's words. Free text, not a tail. */
  suggestedAircraft: z.string().trim().max(200).optional(),

  /**
   * What they offered. `aircraftId` when it is a tail we hold, the two text
   * fields when it is not — an operator flying an airframe we have never
   * entered is normal, and refusing the quote over it would lose the quote.
   */
  aircraftId: z.uuid().nullable().optional(),
  quotedAircraft: z.string().trim().max(200).optional(),
  quotedTailNumber: z.string().trim().max(12).optional(),

  price: optionalNumber('The price must be a number', PRICE),
  amenities: amenityList.optional(),
  terms: z.string().trim().max(2_000).optional(),

  internalNotes: z.string().trim().max(2_000).optional(),
});

export type CreateOperatorQuoteInput = z.infer<
  typeof createOperatorQuoteSchema
>;
export class CreateOperatorQuoteDto extends createZodDto(
  createOperatorQuoteSchema,
) {}

/**
 * Every field optional — this is a PATCH. `null` clears, omitted leaves alone.
 *
 * Written out rather than derived from the create schema with `.partial()`.
 * `.partial()` keeps `.default()`, so an absent field arrives carrying its
 * default and the service writes it; that is how a client update used to reset
 * a VIP to a new lead. See the root AGENTS.md.
 *
 * `status` is deliberately absent: a quote moves through its states by the
 * endpoints that mean something — record a response, approve, reject, decline
 * — never by posting a new string at it. An approval has to check that no
 * other quote on the enquiry is already approved, and a PATCH would walk
 * straight past that.
 */
export const updateOperatorQuoteSchema = z.object({
  suggestedAircraft: z.string().trim().max(200).nullable().optional(),
  aircraftId: z.uuid().nullable().optional(),
  quotedAircraft: z.string().trim().max(200).nullable().optional(),
  quotedTailNumber: z.string().trim().max(12).nullable().optional(),
  price: nullableNumber('The price must be a number', PRICE),
  amenities: amenityList.optional(),
  terms: z.string().trim().max(2_000).nullable().optional(),
  internalNotes: z.string().trim().max(2_000).nullable().optional(),
});

export type UpdateOperatorQuoteInput = z.infer<
  typeof updateOperatorQuoteSchema
>;
export class UpdateOperatorQuoteDto extends createZodDto(
  updateOperatorQuoteSchema,
) {}

/**
 * The operator came back. Separate from a plain update because it is the one
 * write that stamps `respondedAt`, and response time — the number the operator
 * scorecard in scope §6.7 is built on — is measured from it.
 */
export const recordResponseSchema = z.object({
  price: optionalNumber('The price must be a number', PRICE),
  aircraftId: z.uuid().nullable().optional(),
  quotedAircraft: z.string().trim().max(200).optional(),
  quotedTailNumber: z.string().trim().max(12).optional(),
  amenities: amenityList.optional(),
  terms: z.string().trim().max(2_000).optional(),
  internalNotes: z.string().trim().max(2_000).optional(),
});

export type RecordResponseInput = z.infer<typeof recordResponseSchema>;
export class RecordResponseDto extends createZodDto(recordResponseSchema) {}

/**
 * Approving, rejecting or declining.
 *
 * The note is optional on an approval and worth insisting on for the other
 * two — "why did we not go with them" is what the next sourcing round and the
 * operator scorecard both read. Not enforced as required, because a broker
 * clearing a stale board should not be blocked into inventing a reason.
 */
export const decideQuoteSchema = z.object({
  decisionNote: z.string().trim().max(1_000).optional(),
});

export type DecideQuoteInput = z.infer<typeof decideQuoteSchema>;
export class DecideQuoteDto extends createZodDto(decideQuoteSchema) {}
