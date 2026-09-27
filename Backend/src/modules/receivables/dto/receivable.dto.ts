import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { money } from '../../../common/dto/numbers.js';
import { InvoiceStatus } from '../../../generated/prisma/enums.js';
import { INVOICE_STATES } from '../receivables.amounts.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const INVOICE_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'reference',
  'dueDate',
  'issuedAt',
  'status',
] as const;

export const queryInvoicesSchema = paginationSchema
  .extend({
    /**
     * Where the invoice stands — computed from its payments and due date, the
     * scope's "unpaid, partially paid, paid, overdue" plus DRAFT and
     * CANCELLED.
     */
    state: z.enum(INVOICE_STATES).optional(),
    tripId: z.uuid().optional(),
    /** Who is billed. */
    clientId: z.uuid().optional(),
    /** The broker on the invoice's trip. */
    brokerId: z.uuid().optional(),
    sortBy: sortableBy(INVOICE_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryInvoicesInput = z.infer<typeof queryInvoicesSchema>;
export class QueryInvoicesDto extends createZodDto(queryInvoicesSchema) {}

/**
 * The tiles, narrowed to one client (their Payments tab and total spent) or
 * one trip (its financial card). `.strict()`: this endpoint takes no paging,
 * search or sort, and a parameter it would silently ignore is a wrong answer
 * (AGENTS.md, "an endpoint must not accept a parameter it ignores").
 */
export const receivableStatsSchema = z
  .object({
    clientId: z.uuid().optional(),
    tripId: z.uuid().optional(),
  })
  .strict();

export type ReceivableStatsInput = z.infer<typeof receivableStatsSchema>;
export class ReceivableStatsDto extends createZodDto(receivableStatsSchema) {}

const AMOUNT = { min: 0.01, max: 100_000_000 };
const FET = { min: 0, max: 100_000_000 };

const amount = money('The amount must be a number greater than zero', AMOUNT);
const fetAmount = money('The FET must be a number, zero or more', FET);
const notes = z.string().trim().max(5_000);

/**
 * A new invoice. It may be born a DRAFT or already SENT; it cannot be born
 * CANCELLED. `clientId` defaults to the trip's client.
 */
export const createInvoiceSchema = z.object({
  tripId: z.uuid('Choose the trip this invoice is for'),
  /** Who is billed — defaults to the trip's client. */
  clientId: z.uuid().optional(),
  /** The charge before FET. */
  amount,
  /** The FET charged on this invoice. Defaults to 0. */
  fetAmount: fetAmount.optional(),
  status: z.enum([InvoiceStatus.DRAFT, InvoiceStatus.SENT]).default(InvoiceStatus.DRAFT),
  /** The day it went to the client. Defaults to today when the status is SENT. */
  issuedAt: calendarDate.optional(),
  dueDate: calendarDate.optional(),
  notes: notes.optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export class CreateInvoiceDto extends createZodDto(createInvoiceSchema) {}

/**
 * Written out rather than `.partial()` — a create default here would move
 * every edited invoice back to DRAFT (AGENTS.md). `null` clears. The trip is
 * not editable: an invoice raised on the wrong trip is cancelled and raised
 * again, so the document the client received keeps its own history.
 */
export const updateInvoiceSchema = z
  .object({
    clientId: z.uuid().optional(),
    amount: amount.optional(),
    fetAmount: fetAmount.optional(),
    status: z.enum(InvoiceStatus).optional(),
    issuedAt: calendarDate.nullable().optional(),
    dueDate: calendarDate.nullable().optional(),
    notes: notes.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema) {}

/**
 * The payment schemas are shared with Operator Payments and live in
 * `common/dto/payments.ts`; re-exported so this module's imports did not move.
 */
export {
  CreatePaymentDto,
  UpdatePaymentDto,
  createPaymentSchema,
  updatePaymentSchema,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from '../../../common/dto/payments.js';
