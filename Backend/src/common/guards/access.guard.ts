import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCESS_KEY, STAFF_ONLY_KEY, SUPER_ADMIN_ONLY_KEY } from '../constants/auth.constants.js';
import { isPartner } from '../authorization/roles.js';
import type { AccessRequirement } from '../decorators/access.decorator.js';
import { MODULE_BY_KEY, actionLabel } from '../authorization/access.catalogue.js';
import { canDo } from '../authorization/access.js';
import type { AuthenticatedUser } from '../types/api.types.js';
import { UserRole } from '../../generated/prisma/enums.js';

/**
 * Enforces `@RequireAccess(module, action)` against the caller's own
 * permissions, which `JwtStrategy` loads with the user on every request — so
 * a change an administrator saves applies on the person's next click.
 *
 * Runs after JwtAuthGuard. A route without `@RequireAccess` passes through
 * (a read open to every signed-in user, or a rule the service states).
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const user = context.switchToHttp().getRequest<Request>().user as AuthenticatedUser | undefined;
    if (
      this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_ONLY_KEY, targets) &&
      user?.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('These settings belong to the Super Admin.');
    }
    if (this.reflector.getAllAndOverride<boolean>(STAFF_ONLY_KEY, targets)) {
      if (user && isPartner(user.role)) {
        throw new ForbiddenException('This is desk data; the referral portal cannot read it.');
      }
    }

    const requirement = this.reflector.getAllAndOverride<AccessRequirement>(ACCESS_KEY, targets);
    if (!requirement) return true;

    if (
      user &&
      (canDo(user.access, requirement.module, requirement.action) ||
        (requirement.altModule && canDo(user.access, requirement.altModule, requirement.action)))
    ) {
      return true;
    }

    const module = MODULE_BY_KEY[requirement.module]?.label ?? requirement.module;
    throw new ForbiddenException(
      `You do not have permission for ${module} · ${actionLabel(requirement.module, requirement.action)}`,
    );
  }
}
