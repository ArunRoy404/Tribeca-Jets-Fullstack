import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { paginationSchema, sortableBy } from '../../../common/dto/pagination.dto.js';
import { MOVEMENT_KINDS, MovementDirection } from '../../../common/money/movements.js';

/**
 * What narrows the ledger. The same fields filter the list and the totals, so
 * the tiles always describe the rows under them.
 */
const filters = {
  /** CLIENT_PAYMENT (in), OPERATOR_PAYMENT or COMMISSION (out). */
  kind: z.enum(MOVEMENT_KINDS).optional(),
  direction: z.enum(MovementDirection).optional(),
  /** Inclusive, by the day the money moved. */
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  tripId: z.uuid().optional(),
};

const rangeInOrder = (value: { from?: Date; to?: Date }) => !value.from || !value.to || value.from <= value.to;
const RANGE_MESSAGE = { message: '`from` must be on or before `to`', path: ['to'] };

/**
 * `.strict()`: the ledger sorts by one thing — the day the money moved — and
 * has no archived half (a withdrawn payment is not money that moved). A
 * parameter it would silently ignore is a wrong answer (AGENTS.md).
 */
export const queryTransactionsSchema = paginationSchema
  .extend({
    ...filters,
    sortBy: sortableBy(['date'] as const, 'date'),
  })
  .strict()
  .refine(rangeInOrder, RANGE_MESSAGE);

export type QueryTransactionsInput = z.infer<typeof queryTransactionsSchema>;
export class QueryTransactionsDto extends createZodDto(queryTransactionsSchema) {}

export const transactionStatsSchema = z
  .object({
    ...filters,
    search: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine(rangeInOrder, RANGE_MESSAGE);

export type TransactionStatsInput = z.infer<typeof transactionStatsSchema>;
export class TransactionStatsDto extends createZodDto(transactionStatsSchema) {}
