import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { money } from '../../../common/dto/numbers.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { CreditEntryType } from '../../../generated/prisma/enums.js';

/**
 * Bounds that exist to catch a slipped keystroke, not to model charter.
 *
 * The ceiling is the `Decimal(12, 2)` column's, less a digit: a ten-million
 * dollar credit on a private-jet account is an extra zero, and storing it
 * silently puts a wrong number on a client's profile and into whatever the
 * desk reconciles against.
 *
 * **The floor is above zero, deliberately.** A zero-amount movement is not a
 * movement — it changes no balance and explains nothing — and every one of
 * them is a row somebody has to read past later.
 */
const AMOUNT = { min: 0.01, max: 10_000_000 };

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const CLIENT_CREDIT_SORTABLE_FIELDS = [
  'occurredAt',
  'createdAt',
  'updatedAt',
  'amount',
] as const;

export const queryClientCreditsSchema = paginationSchema
  .extend({
    /**
     * **Required.** There is no "all credits" endpoint: money on account is
     * only meaningful beside the client holding it, and an unscoped list would
     * be the one query that ignores the row-level rule the client carries.
     */
    clientId: z.uuid('Choose which client this ledger belongs to'),
    type: z.enum(CreditEntryType).optional(),
    /**
     * The ledger opens on the newest *movement*, not the newest row typed in.
     * A credit dated the 3rd and entered on the 9th belongs where the money
     * moved.
     */
    sortBy: sortableBy(CLIENT_CREDIT_SORTABLE_FIELDS, 'occurredAt'),
  })
  .extend(archiveQuerySchema.shape);

export type QueryClientCreditsInput = z.infer<typeof queryClientCreditsSchema>;
export class QueryClientCreditsDto extends createZodDto(
  queryClientCreditsSchema,
) {}

/** The summary endpoint needs only the client — it summarises the whole ledger. */
export const clientCreditSummarySchema = z
  .object({
    clientId: z.uuid('Choose which client this ledger belongs to'),
  })
  // Strict for the same reason the notes timeline is: a summary honours no
  // filter, and an accepted-but-ignored `?type=CREDIT` would report the whole
  // balance while the caller believed they had narrowed it.
  .strict();

export type ClientCreditSummaryInput = z.infer<typeof clientCreditSummarySchema>;
export class ClientCreditSummaryDto extends createZodDto(
  clientCreditSummarySchema,
) {}

export const createClientCreditSchema = z.object({
  clientId: z.uuid('Choose which client this credit belongs to'),

  type: z.enum(CreditEntryType),

  /**
   * Always positive; `type` carries the direction.
   *
   * `money` rather than `z.coerce.number()` for two reasons: an empty amount
   * box coerces to **0**, a movement of nothing indistinguishable from a
   * deliberate zero; and a third decimal place is not a finer amount but one
   * the `Decimal(12, 2)` column rounds on the way in, leaving the balance the
   * service checked disagreeing with the row it wrote.
   */
  amount: money('Enter how much', AMOUNT),

  /** The day the money moved, not the day it was typed in. */
  occurredAt: calendarDate,

  reason: z.string().trim().min(1).max(500).optional(),
  reference: z.string().trim().min(1).max(100).optional(),
});

export type CreateClientCreditInput = z.infer<typeof createClientCreditSchema>;
export class CreateClientCreditDto extends createZodDto(
  createClientCreditSchema,
) {}

/**
 * Written out longhand rather than with `.partial()`, which keeps `.default()`
 * and would rewrite fields the caller never mentioned.
 *
 * `clientId` is absent on purpose: money does not move between clients. An
 * entry filed against the wrong one is withdrawn and re-entered, which leaves
 * the mistake visible on both ledgers instead of silently moving a balance.
 */
export const updateClientCreditSchema = z
  .object({
    type: z.enum(CreditEntryType).optional(),
    amount: money('Enter how much', AMOUNT).optional(),
    occurredAt: calendarDate.optional(),
    /** `null` clears it; absent leaves it alone. */
    reason: z.string().trim().min(1).max(500).nullable().optional(),
    reference: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateClientCreditInput = z.infer<typeof updateClientCreditSchema>;
export class UpdateClientCreditDto extends createZodDto(
  updateClientCreditSchema,
) {}
