import { z } from 'zod';
import { createZodDto } from './zod-dto.js';
import { calendarDate } from './dates.js';
import { money } from './numbers.js';
import { PaymentMethod } from '../../generated/prisma/enums.js';

/**
 * One payment against a bill — money received on a client invoice, or money
 * sent against an operator payable. The same fields either way (scope §10
 * "Payment": amount, date, method, reference, notes), so one schema; shared
 * since Operator Payments became its second caller.
 */

export const PAYMENT_AMOUNT = { min: 0.01, max: 100_000_000 };

const amount = money('The payment must be a number greater than zero', PAYMENT_AMOUNT);
const reference = z.string().trim().max(100);
const notes = z.string().trim().max(5_000);

export const createPaymentSchema = z.object({
  amount,
  /** The day the money moved. Defaults to today. */
  paidAt: calendarDate.optional(),
  method: z.enum(PaymentMethod),
  /** A wire confirmation, a cheque number. */
  reference: reference.optional(),
  notes: notes.optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}

/** Written out, not `.partial()` (AGENTS.md). `null` clears reference and notes. */
export const updatePaymentSchema = z
  .object({
    amount: amount.optional(),
    paidAt: calendarDate.optional(),
    method: z.enum(PaymentMethod).optional(),
    reference: reference.nullable().optional(),
    notes: notes.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export class UpdatePaymentDto extends createZodDto(updatePaymentSchema) {}
