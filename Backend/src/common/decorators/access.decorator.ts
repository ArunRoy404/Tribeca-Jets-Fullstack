import { SetMetadata } from '@nestjs/common';
import { ACCESS_KEY, STAFF_ONLY_KEY } from '../constants/auth.constants.js';
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

/**
 * Staff only: a referral agent (a partner) is refused with 403, whatever
 * else the route allows. For the open reads (AGENTS.md, "Reads are open to
 * every signed-in user") over desk data a partner never needs — an
 * operator's contacts and terms. Identity, like `isPartner`: never switchable.
 *
 * On a controller it covers every route; on a handler, that route.
 */
export const StaffOnly = () => SetMetadata(STAFF_ONLY_KEY, true);
