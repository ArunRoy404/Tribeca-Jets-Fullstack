import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../constants/auth.constants.js';
import type { PermissionRequirement } from '../decorators/permissions.decorator.js';
import { can, canWrite, PERMISSION_LABELS } from '../authorization/permissions.js';
import type { AuthenticatedUser } from '../types/api.types.js';

/**
 * Capability-level authorization, driven by the matrix in
 * `authorization/permissions.ts`.
 *
 * Deliberately NOT row-level. A guard sees the request before any query is
 * built, so it cannot express "only the trips this broker owns" — that lives
 * in the service, which calls `scopeFor()` and narrows its `where`. Trying to
 * do row-level checks here is how a list endpoint ends up leaking rows it then
 * filters in the response.
 *
 * Runs after JwtAuthGuard, so `request.user` is populated for any route that
 * reaches it. A route with no `@RequirePermissions` passes through — being
 * authenticated is already enforced globally.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement =
      this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requirement?.permissions?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    const check = requirement.write ? canWrite : can;
    const missing = requirement.permissions.filter(
      (permission) => !check(user.role, permission),
    );

    if (missing.length) {
      // Name the capability rather than the role. Telling a caller which roles
      // would have worked maps out the privilege model for them.
      const labels = missing
        .map((permission) => PERMISSION_LABELS[permission] ?? permission)
        .join(', ');
      throw new ForbiddenException(
        `Your role does not allow this action (${labels})`,
      );
    }

    return true;
  }
}
