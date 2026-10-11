import { z } from 'zod';
import { passwordSchema } from '../../auth/dto/verification.dto.js';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import {
  CommissionBasis,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums.js';
import { nullableNumber, optionalNumber } from '../../../common/dto/numbers.js';
import { Action, Module } from '../../../common/authorization/access.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const USER_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'firstName',
  'lastName',
  'email',
  'role',
  'status',
  'lastLoginAt',
] as const;

/**
 * SUPER_ADMIN is deliberately absent. It is the seeded owner account and is
 * never assignable through the API — otherwise an admin could mint a second
 * account immune to their own administration.
 */
export const assignableRoleSchema = z.enum([
  UserRole.ADMIN,
  UserRole.BROKER,
  UserRole.ASSISTANT,
  UserRole.REFERRAL_AGENT,
]);

/**
 * One person's permissions: the actions ticked per module,
 * `{ "QUOTES": ["VIEW", "SEND"] }`. A module left out has no access. What the
 * role may never hold is refused by the service, which also adds VIEW and
 * the modules a ticked one depends on — see `normaliseGrants`.
 */
export const permissionsSchema = z.partialRecord(
  z.enum(Module),
  z.array(z.enum(Action)).max(Object.keys(Action).length),
);

/**
 * A referral agent's standard commission (#11). Only meaningful on a
 * REFERRAL_AGENT account, which the service enforces; `null` clears it.
 */
export const COMMISSION_PERCENTAGE = { min: 0.01, max: 100 };
export const COMMISSION_AMOUNT = { min: 0.01, max: 10_000_000 };

/**
 * The statuses an administrator may actually set.
 *
 * INVITED is absent: it is not a decision, it is the state an account is born
 * in and leaves exactly once, by the invitee accepting the invitation. Letting
 * it be set by hand would mean an administrator could push a live account back
 * into a pending state it has no way to leave a second time.
 */
export const manageableStatusSchema = z.enum([
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
]);

// No `archived` param here, unlike every other module: accounts are never
// removed, so there is no archived half of this list to ask for.
export const queryUsersSchema = paginationSchema.extend({
  /** Filter to one role. Omit for all roles. */
  role: z.enum(UserRole).optional(),
  /** Filter to one status. Omit for all statuses. */
  status: z.enum(UserStatus).optional(),
  sortBy: sortableBy(USER_SORTABLE_FIELDS),
});

export type QueryUsersInput = z.infer<typeof queryUsersSchema>;
export class QueryUsersDto extends createZodDto(queryUsersSchema) {}

/**
 * An invitation carries the first password (owner's decision, 6 Oct 2026).
 *
 * The administrator chooses it, the invitation email delivers it, and the
 * account stays INVITED until that password is first used to sign in. Same
 * policy as every other password. The trade-off is deliberate: the inviter
 * knows it and it sits in an inbox, so the email tells the invitee to change
 * it from My Account.
 */
export const inviteUserSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: z.string().trim().max(40).optional(),
  role: assignableRoleSchema.default(UserRole.BROKER),
  /**
   * Omit for the role's defaults. Sending it needs Users & Roles · Change
   * roles & permissions.
   */
  permissions: permissionsSchema.optional(),
  /**
   * A referral agent's standard commission, settable with the invitation so
   * the desk does not have to invite and then edit. Same rules as on update;
   * refused for any other role.
   */
  commissionBasis: z.enum(CommissionBasis).optional(),
  commissionPercentage: optionalNumber(
    'The percentage must be a number between 0 and 100',
    COMMISSION_PERCENTAGE,
  ),
  commissionAmount: optionalNumber('The amount must be a number', COMMISSION_AMOUNT),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export class InviteUserDto extends createZodDto(inviteUserSchema) {}

/**
 * Every field optional — this is a PATCH.
 *
 * Note what is absent: `email` cannot be changed (it is the login identity and
 * the audit trail's anchor), `password` is never set by an administrator, and
 * `status` accepts only ACTIVE or SUSPENDED.
 */
export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    /**
     * Changing the role without `permissions` resets them to the new role's
     * defaults: the old role's ticks may include what the new one can never
     * hold.
     */
    role: assignableRoleSchema.optional(),
    /** The full set — what is sent replaces what is stored. */
    permissions: permissionsSchema.optional(),
    /** ACTIVE or SUSPENDED only — see `manageableStatusSchema`. */
    status: manageableStatusSchema.optional(),
    twoFactorEnabled: z.boolean().optional(),
    commissionBasis: z.enum(CommissionBasis).nullable().optional(),
    /** Percent of Tribeca's profit, for PERCENT_OF_PROFIT. */
    commissionPercentage: nullableNumber(
      'The percentage must be a number between 0 and 100',
      COMMISSION_PERCENTAGE,
    ),
    /** The fee, for FLAT_FEE. */
    commissionAmount: nullableNumber(
      'The amount must be a number',
      COMMISSION_AMOUNT,
    ),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export class UpdateUserDto extends createZodDto(updateUserSchema) {}
