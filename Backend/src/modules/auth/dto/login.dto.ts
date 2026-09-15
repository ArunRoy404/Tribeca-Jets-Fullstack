import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';

export const loginSchema = z.object({
  email: z.email('A valid email address is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export class LoginDto extends createZodDto(loginSchema) {}
