import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { money } from '../../../common/dto/numbers.js';
import { OperatorPayableStatus } from '../../../generated/prisma/enums.js';
import { PAYABLE_STATES } from '../operator-payments.amounts.js';

/**
 * A payment against a bill is the same shape here as on a client invoice;
 * the schema lives in `common/dto/payments.ts` and is re-exported so this
 * module's imports read from one place.
 */
export {
  CreatePaymentDto,
  UpdatePaymentDto,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from '../../../common/dto/payments.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const PAYABLE_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'reference', 'dueDate', 'status'] as const;

export const queryPayablesSchema = paginationSchema
  .extend({
    /** Computed from the payments and the due date, never stored. */
    state: z.enum(PAYABLE_STATES).optional(),
    tripId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    /** The broker on the payable's trip. */
    brokerId: z.uuid().optional(),
    sortBy: sortableBy(PAYABLE_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryPayablesInput = z.infer<typeof queryPayablesSchema>;
export class QueryPayablesDto extends createZodDto(queryPayablesSchema) {}

/**
 * The tiles, narrowed to one operator (their page's Payments tab and Total
 * Paid) or one trip. `.strict()`: a parameter this endpoint would silently
 * ignore is a wrong answer.
 */
export const payableStatsSchema = z
  .object({
    operatorId: z.uuid().optional(),
    tripId: z.uuid().optional(),
  })
  .strict();

export type PayableStatsInput = z.infer<typeof payableStatsSchema>;
export class PayableStatsDto extends createZodDto(payableStatsSchema) {}

const amount = money('The amount must be a number greater than zero', { min: 0.01, max: 100_000_000 });
const operatorReference = z.string().trim().max(100);
const notes = z.string().trim().max(5_000);

/** An operator's bill on a trip. `operatorId` defaults to the trip's operator. */
export const createPayableSchema = z.object({
  tripId: z.uuid('Choose the trip this bill is for'),
  operatorId: z.uuid().optional(),
  /** What the operator billed. */
  amount,
  dueDate: calendarDate.optional(),
  /** The operator's own invoice number. */
  operatorReference: operatorReference.optional(),
  notes: notes.optional(),
});

export type CreatePayableInput = z.infer<typeof createPayableSchema>;
export class CreatePayableDto extends createZodDto(createPayableSchema) {}

/**
 * Written out rather than `.partial()` (AGENTS.md). `null` clears. The trip is
 * fixed once recorded — a bill on the wrong trip is cancelled and recorded
 * again, so the history says so.
 */
export const updatePayableSchema = z
  .object({
    operatorId: z.uuid().optional(),
    amount: amount.optional(),
    status: z.enum(OperatorPayableStatus).optional(),
    dueDate: calendarDate.nullable().optional(),
    operatorReference: operatorReference.nullable().optional(),
    notes: notes.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdatePayableInput = z.infer<typeof updatePayableSchema>;
export class UpdatePayableDto extends createZodDto(updatePayableSchema) {}
