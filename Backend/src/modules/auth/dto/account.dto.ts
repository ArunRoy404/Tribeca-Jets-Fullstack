import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { pageFields } from '../../../common/dto/pagination.dto.js';
import { uploadUrl } from '../../../common/dto/uploads.js';
import { passwordSchema } from './verification.dto.js';

/**
 * The signed-in user editing their own profile (My Account).
 *
 * Narrower than `PATCH /users/:id` on purpose: email is the login identity,
 * and role, status and commission terms are an administrator's decisions.
 * `.strict()` so a caller sending `role` is told no rather than silently
 * ignored.
 */
export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
    lastName: z.string().trim().min(1, 'Last name is required').max(100).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    /** An upload URL from `POST /uploads/image`, or null to remove the photo. */
    avatarUrl: uploadUrl.nullable().optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}

/** Turning one's own two-factor on or off. Either way needs the password. */
export const setTwoFactorSchema = z
  .object({
    enabled: z.boolean(),
    currentPassword: z.string().min(1, 'Enter your current password'),
  })
  .strict();

export type SetTwoFactorInput = z.infer<typeof setTwoFactorSchema>;
export class SetTwoFactorDto extends createZodDto(setTwoFactorSchema) {}

/**
 * Paging only. A handful of devices has nothing to search or sort by, and
 * `.strict()` refuses `?search=` rather than answering as if it filtered.
 */
export const sessionsQuerySchema = z.object(pageFields).strict();

export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;
export class SessionsQueryDto extends createZodDto(sessionsQuerySchema) {}
