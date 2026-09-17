import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  requiredNumber,
  optionalNumber,
  nullableNumber,
} from '../../../common/dto/numbers.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { QuoteStatus } from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const QUOTE_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'reference',
  'basePrice',
  'status',
  'departureDate',
  'validUntil',
  'sentAt',
] as const;

/**
 * A charter price, bounded to catch a slipped keystroke rather than to model
 * the market. The floor is 0 because a $0 line is real — a waived positioning
 * leg, a goodwill repositioning — and rejecting it would push the desk into
 * typing 1.
 */
const MONEY = { min: 0, max: 100_000_000 };

/**
 * Federal Excise Tax, as a rate rather than a percentage: 0.075, not 7.5.
 *
 * Bounded at 1 because a rate above 100% is always a typo — someone typing
 * "7.5" meaning 7.5%. Catching it here is the difference between a $79,500
 * quote and a $676,000 one, and the second would go out to a client.
 */
const FET_RATE = { min: 0, max: 1 };

/**
 * One extra on the offer: catering, ground transportation, de-icing.
 *
 * `included: true` is the "Included" the quote prints — a line the client sees
 * with no money against it. An `amount` adds to the total. Both together is
 * accepted and means a priced item the desk still describes as included in the
 * package; neither means a line with nothing to say, which is refused.
 */
const lineItem = z
  .object({
    label: z.string().trim().min(1, 'Every line needs a label').max(120),
    amount: nullableNumber('That line item amount is not a number', MONEY),
    included: z.boolean().default(false),
  })
  .refine((item) => item.included || item.amount != null, {
    message: 'A line item needs either a price or to be marked as included',
    path: ['amount'],
  });

const lineItemList = z
  .array(lineItem)
  .max(40, 'That is more line items than a quote can carry');

export const queryQuotesSchema = paginationSchema
  .extend({
    status: z.enum(QuoteStatus).optional(),
    clientId: z.uuid().optional(),
    assignedBrokerId: z.uuid().optional(),
    /** Every quote built from one enquiry — how the request detail loads them. */
    tripRequestId: z.uuid().optional(),
    operatorId: z.uuid().optional(),

    /**
     * `true` keeps only quotes still waiting on the client: draft, sent or
     * viewed. The board is a working list, and a month of approved quotes
     * buries the one that expires on Friday.
     */
    openOnly: z.stringbool().default(false),

    /**
     * `true` keeps only live offers whose `validUntil` has passed.
     *
     * Expiry is derived, never a status a background job writes — see the
     * service. This filter is how the desk finds the ones to chase or let go.
     */
    expired: z.stringbool().default(false),

    sortBy: sortableBy(QUOTE_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryQuotesInput = z.infer<typeof queryQuotesSchema>;
export class QueryQuotesDto extends createZodDto(queryQuotesSchema) {}

/**
 * Writing a new offer.
 *
 * `status` is deliberately absent: every quote is born a DRAFT. It moves by the
 * endpoints that mean something — send, approve, reject, expire — because each
 * of those has a rule attached (a draft cannot be approved; sending stamps the
 * date the client's clock starts from), and a status posted straight at a PATCH
 * walks past all of them.
 *
 * So are `version`, `sentAt` and the computed money. A caller does not get to
 * name what version this is or what it totals — the service works both out.
 */
export const createQuoteSchema = z.object({
  clientId: z.uuid('Choose who this quote is for'),

  /** The enquiry it answers, and the operator price it is built on. */
  tripRequestId: z.uuid().nullable().optional(),
  operatorQuoteId: z.uuid().nullable().optional(),

  assignedBrokerId: z.uuid().nullable().optional(),
  operatorId: z.uuid().nullable().optional(),

  aircraftId: z.uuid().nullable().optional(),
  quotedAircraft: z.string().trim().max(200).optional(),

  originAirportId: z.uuid().nullable().optional(),
  destinationAirportId: z.uuid().nullable().optional(),

  departureDate: calendarDate.optional(),
  returnDate: calendarDate.optional(),
  validUntil: calendarDate.optional(),

  passengers: optionalNumber('Passengers must be a whole number', {
    min: 1,
    max: 100,
    int: true,
  }),

  basePrice: requiredNumber('The base price is required', MONEY),
  fetEnabled: z.boolean().default(true),
  fetRate: optionalNumber('The FET rate must be a number like 0.075', FET_RATE),

  operatorCost: optionalNumber('The operator cost must be a number', MONEY),
  depositAmount: optionalNumber('The deposit must be a number', MONEY),

  lineItems: lineItemList.optional(),

  terms: z.string().trim().max(5_000).optional(),
  internalNotes: z.string().trim().max(2_000).optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export class CreateQuoteDto extends createZodDto(createQuoteSchema) {}

/**
 * Every field optional — this is a PATCH. `null` clears, omitted leaves alone.
 *
 * Written out rather than derived with `.partial()`. `.partial()` keeps
 * `.default()`, so an absent `fetEnabled` would arrive as `true` and quietly
 * re-apply tax to an international leg someone had exempted. See the root
 * AGENTS.md for what that cost us on Clients.
 */
export const updateQuoteSchema = z.object({
  tripRequestId: z.uuid().nullable().optional(),
  operatorQuoteId: z.uuid().nullable().optional(),
  assignedBrokerId: z.uuid().nullable().optional(),
  operatorId: z.uuid().nullable().optional(),

  aircraftId: z.uuid().nullable().optional(),
  quotedAircraft: z.string().trim().max(200).nullable().optional(),

  originAirportId: z.uuid().nullable().optional(),
  destinationAirportId: z.uuid().nullable().optional(),

  departureDate: calendarDate.nullable().optional(),
  returnDate: calendarDate.nullable().optional(),
  validUntil: calendarDate.nullable().optional(),

  passengers: nullableNumber('Passengers must be a whole number', {
    min: 1,
    max: 100,
    int: true,
  }),

  basePrice: optionalNumber('The base price must be a number', MONEY),
  fetEnabled: z.boolean().optional(),
  fetRate: optionalNumber('The FET rate must be a number like 0.075', FET_RATE),

  operatorCost: nullableNumber('The operator cost must be a number', MONEY),
  depositAmount: nullableNumber('The deposit must be a number', MONEY),

  lineItems: lineItemList.optional(),

  terms: z.string().trim().max(5_000).nullable().optional(),
  internalNotes: z.string().trim().max(2_000).nullable().optional(),

  /**
   * What changed and why — "Added return leg", "Adjusted FET and catering".
   *
   * Only used when the edit moves the money, because that is the only time a
   * version is cut. Retyping the address of the FBO is not a new version of
   * the offer.
   */
  versionNote: z.string().trim().max(300).optional(),
});

export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export class UpdateQuoteDto extends createZodDto(updateQuoteSchema) {}

/**
 * Sending the offer to the client.
 *
 * `validUntil` is accepted here because the shelf life is usually decided at
 * the moment of sending — "this price holds until Friday" — and making the
 * broker go back into the edit form to set it is how quotes go out with no
 * expiry at all.
 */
export const sendQuoteSchema = z.object({
  validUntil: calendarDate.optional(),
  note: z.string().trim().max(300).optional(),
});

export type SendQuoteInput = z.infer<typeof sendQuoteSchema>;
export class SendQuoteDto extends createZodDto(sendQuoteSchema) {}

/**
 * The client answered, or the desk gave up on it.
 *
 * The note matters most on a rejection: "went with a cheaper operator" is what
 * the next quote to that client is priced against. Not enforced as required —
 * a broker clearing a stale board should not be blocked into inventing one.
 */
export const decideQuoteSchema = z.object({
  decisionNote: z.string().trim().max(1_000).optional(),
});

export type DecideQuoteInput = z.infer<typeof decideQuoteSchema>;
export class DecideQuoteDto extends createZodDto(decideQuoteSchema) {}
