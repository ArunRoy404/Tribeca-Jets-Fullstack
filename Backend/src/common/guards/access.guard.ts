import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCESS_KEY } from '../constants/auth.constants.js';
import type { AccessRequirement } from '../decorators/access.decorator.js';
import { MODULE_BY_KEY, actionLabel } from '../authorization/access.catalogue.js';
import { canDo } from '../authorization/access.js';
import type { AuthenticatedUser } from '../types/api.types.js';

/**
 * Enforces `@RequireAccess(module, action)` against the caller's own
 * permissions, which `JwtStrategy` loads with the user on every request — so
 * a change an administrator saves applies on the person's next click.
 *
 * Runs after JwtAuthGuard. A route without `@RequireAccess` passes through;
 * modules not yet moved over are still guarded by `PermissionsGuard`.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<AccessRequirement>(ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requirement) return true;

    const user = context.switchToHttp().getRequest<Request>().user as AuthenticatedUser | undefined;
    if (user && canDo(user.access, requirement.module, requirement.action)) return true;

    const module = MODULE_BY_KEY[requirement.module]?.label ?? requirement.module;
    throw new ForbiddenException(
      `You do not have permission for ${module} · ${actionLabel(requirement.module, requirement.action)}`,
    );
  }
}
