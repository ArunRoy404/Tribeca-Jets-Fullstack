import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/auth.constants.js';
import type { UserRole } from '../../generated/prisma/enums.js';

/** Restricts a route to the listed roles. Enforced by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
