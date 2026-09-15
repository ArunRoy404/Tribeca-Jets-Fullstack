import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/auth.constants.js';

/**
 * Opts a route out of the global JwtAuthGuard.
 *
 * Authentication is on by default; forgetting this decorator makes a route
 * private, which is the safe direction to fail.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
