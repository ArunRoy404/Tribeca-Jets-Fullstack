import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/auth.constants.js';
import type { Permission } from '../authorization/permissions.js';

export interface PermissionRequirement {
  permissions: Permission[];
  /**
   * When true the caller must hold a scope that permits modification, so a
   * READ grant is rejected. Set automatically by `@RequireWritePermissions`.
   */
  write: boolean;
}

/**
 * Requires the caller to hold every listed permission at any non-NONE scope.
 *
 * This is a *capability* check only. It answers "may this role touch this
 * feature at all", never "may this role touch this row" — row-level scope is
 * the service layer's job, because a guard cannot narrow a `findMany`.
 *
 *   @RequirePermissions(Permission.MANAGE_USERS)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, {
    permissions,
    write: false,
  } satisfies PermissionRequirement);

/**
 * Same, but rejects a READ-only grant.
 *
 * Use this on every mutating route. `@RequirePermissions` alone would let an
 * assistant — who holds OPERATOR_SOURCING at READ scope — through to a POST.
 */
export const RequireWritePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, {
    permissions,
    write: true,
  } satisfies PermissionRequirement);
