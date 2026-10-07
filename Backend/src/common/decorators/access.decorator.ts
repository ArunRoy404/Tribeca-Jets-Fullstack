import { SetMetadata } from '@nestjs/common';
import { ACCESS_KEY } from '../constants/auth.constants.js';
import { Action, type Module } from '../authorization/access.js';

export interface AccessRequirement {
  module: Module;
  action: Action;
}

/**
 * Requires the caller to hold `action` in `module` — the per-user
 * permissions (7 Oct 2026). Replaces `@RequirePermissions` module by module
 * as each one is reviewed.
 *
 * A capability check only, like the old one: *which* rows the action reaches
 * is the role's reach, applied in the service with `reachOf`.
 *
 *   @RequireAccess(Module.USERS, Action.EDIT)
 */
export const RequireAccess = (module: Module, action: Action = Action.VIEW) =>
  SetMetadata(ACCESS_KEY, { module, action } satisfies AccessRequirement);
