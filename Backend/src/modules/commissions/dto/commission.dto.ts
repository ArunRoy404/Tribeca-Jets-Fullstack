import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { money } from '../../../common/dto/numbers.js';
import {
  CommissionBasis,
  CommissionPaymentMethod,
  CommissionRecipientType,
  CommissionStatus,
} from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const COMMISSION_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'reference',
  'paidAt',
  'status',
] as const;

export const queryCommissionsSchema = paginationSchema
  .extend({
    status: z.enum(CommissionStatus).optional(),
    recipientType: z.enum(CommissionRecipientType).optional(),
    tripId: z.uuid().optional(),
    referralId: z.uuid().optional(),
    recipientUserId: z.uuid().optional(),
    brokerId: z.uuid().optional(),
    sortBy: sortableBy(COMMISSION_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryCommissionsInput = z.infer<typeof queryCommissionsSchema>;
export class QueryCommissionsDto extends createZodDto(queryCommissionsSchema) {}

const PERCENT = { min: 0.01, max: 100 };
const AMOUNT = { min: 0.01, max: 10_000_000 };

const percentage = money('The percentage must be a number between 0 and 100', PERCENT);
const amount = money('The amount must be a number', AMOUNT);

/**
 * Raising a commission. `basis` may be left out for a referral agent: their
 * standing structure (set on their account) is copied in, which is what "a
 * different commission structure for each referral agent" means in practice.
 * Anyone else needs it stated.
 */
export const createCommissionSchema = z.object({
  tripId: z.uuid('Choose the trip this commission is on'),

  recipientType: z.enum(CommissionRecipientType),
  /** A REFERRAL_AGENT account, for `recipientType: REFERRAL_AGENT`. */
  recipientUserId: z.uuid().optional(),
  /** A CRM client, for `recipientType: CLIENT`. */
  recipientClientId: z.uuid().optional(),
  /** Who is paid, for `recipientType: MANUAL`. */
  recipientName: z.string().trim().min(1).max(200).optional(),
  recipientCompany: z.string().trim().max(200).optional(),

  referralId: z.uuid().optional(),
  /** Defaults to the trip's broker. */
  brokerId: z.uuid().nullable().optional(),

  basis: z.enum(CommissionBasis).optional(),
  percentage: percentage.optional(),
  amount: amount.optional(),
  finalAmount: amount.optional(),

  status: z.enum(CommissionStatus).default(CommissionStatus.PENDING),
  method: z.enum(CommissionPaymentMethod).optional(),
  /** Defaults to today when the status is PAID and no day is given. */
  paidAt: calendarDate.optional(),
  notes: z.string().trim().max(5_000).optional(),
});

export type CreateCommissionInput = z.infer<typeof createCommissionSchema>;
export class CreateCommissionDto extends createZodDto(createCommissionSchema) {}

/**
 * Written out rather than `.partial()` — a create default here would reset
 * every edited commission to PENDING (AGENTS.md). `null` clears.
 *
 * Changing the recipient means sending `recipientType` with the column it
 * needs; the service clears the other two.
 */
export const updateCommissionSchema = z
  .object({
    tripId: z.uuid().optional(),
    recipientType: z.enum(CommissionRecipientType).optional(),
    recipientUserId: z.uuid().nullable().optional(),
    recipientClientId: z.uuid().nullable().optional(),
    recipientName: z.string().trim().min(1).max(200).nullable().optional(),
    recipientCompany: z.string().trim().max(200).nullable().optional(),

    referralId: z.uuid().nullable().optional(),
    brokerId: z.uuid().nullable().optional(),

    basis: z.enum(CommissionBasis).optional(),
    percentage: percentage.nullable().optional(),
    amount: amount.nullable().optional(),
    finalAmount: amount.nullable().optional(),

    status: z.enum(CommissionStatus).optional(),
    method: z.enum(CommissionPaymentMethod).nullable().optional(),
    paidAt: calendarDate.nullable().optional(),
    notes: z.string().trim().max(5_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateCommissionInput = z.infer<typeof updateCommissionSchema>;
export class UpdateCommissionDto extends createZodDto(updateCommissionSchema) {}
