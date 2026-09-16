import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';

/**
 * The OTP screens post only the code: the challenge itself is carried in an
 * httpOnly cookie, so there is no challenge field here by design.
 */
export const verifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export class VerifyCodeDto extends createZodDto(verifyCodeSchema) {}

export const forgotPasswordSchema = z.object({
  email: z.email('A valid email address is required').toLowerCase().trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}

/**
 * Password policy. Length does more for strength than character-class rules,
 * so the floor is 10 with a light complexity requirement rather than a long
 * list of rules users work around with "Password1!".
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number');

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
