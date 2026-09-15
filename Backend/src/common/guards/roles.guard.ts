import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../constants/auth.constants.js';
import type { AuthenticatedUser } from '../types/api.types.js';
import type { UserRole } from '../../generated/prisma/enums.js';

/**
 * Coarse, role-level authorization.
 *
 * Row-level rules (a broker seeing only their own clients) are NOT handled
 * here — they belong in the service layer where the query is built, because a
 * guard cannot scope a `findMany`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
