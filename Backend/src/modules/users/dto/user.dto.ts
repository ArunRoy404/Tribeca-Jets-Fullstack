import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { paginationSchema } from '../../../common/dto/pagination.dto.js';
import { UserRole, UserStatus } from '../../../generated/prisma/enums.js';

/**
 * Columns a caller may sort by.
 *
 * A closed list, not a free string: passing caller input straight into Prisma's
 * `orderBy` lets anyone sort by an unindexed column and table-scan the users
 * table, and leaks which columns exist.
 */
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
  UserRole.SENIOR_BROKER,
  UserRole.BROKER,
  UserRole.ASSISTANT,
]);

export const queryUsersSchema = paginationSchema.extend({
  /** Filter to one role. Omit for all roles. */
  role: z.enum(UserRole).optional(),
  /** Filter to one status. Omit for all statuses. */
  status: z.enum(UserStatus).optional(),
  sortBy: z.enum(USER_SORTABLE_FIELDS).default('createdAt'),
  /**
   * Include soft-deleted accounts. Administrators only — enforced in the
   * service, since a query param must never widen visibility on its own.
   */
  includeDeleted: z.coerce.boolean().default(false),
});

export type QueryUsersInput = z.infer<typeof queryUsersSchema>;
export class QueryUsersDto extends createZodDto(queryUsersSchema) {}

/**
 * Invitation, not creation: no password is accepted here.
 *
 * The account is created in INVITED status with an unusable random password,
 * and the invitee sets a real one through the existing password-reset flow.
 * That way a password is never chosen by, transmitted to, or known by the
 * person doing the inviting.
 */
export const inviteUserSchema = z.object({
  email: z.email().toLowerCase().trim(),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: z.string().trim().max(40).optional(),
  role: assignableRoleSchema.default(UserRole.BROKER),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export class InviteUserDto extends createZodDto(inviteUserSchema) {}

/**
 * Every field optional — this is a PATCH.
 *
 * Note what is absent: `email` cannot be changed (it is the login identity and
 * the audit trail's anchor), and `password` is never set by an administrator.
 */
export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    role: assignableRoleSchema.optional(),
    status: z.enum(UserStatus).optional(),
    twoFactorEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export class UpdateUserDto extends createZodDto(updateUserSchema) {}
