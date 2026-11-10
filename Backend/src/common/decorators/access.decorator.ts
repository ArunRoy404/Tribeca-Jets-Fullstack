import { SetMetadata } from '@nestjs/common';
import { ACCESS_KEY, STAFF_ONLY_KEY } from '../constants/auth.constants.js';
import { Action, type Module } from '../authorization/access.js';

export interface AccessRequirement {
  module: Module;
  action: Action;
  altModule?: Module;
}

/**
 * Requires the caller to hold `action` in `module` (or optionally `altModule`) — the per-user
 * permissions (7 Oct 2026). It replaced the old role matrix's
 * `@RequirePermissions` module by module; the last moved on 10 Nov 2026.
 *
 * A capability check only, like the old one: *which* rows the action reaches
 * is the role's reach, applied in the service with `reachOf`.
 *
 *   @RequireAccess(Module.USERS, Action.EDIT)
 */
export const RequireAccess = (
  module: Module,
  action: Action = Action.VIEW,
  altModule?: Module,
) =>
  SetMetadata(
    ACCESS_KEY,
    { module, action, altModule } satisfies AccessRequirement,
  );

/**
 * Staff only: a referral agent (a partner) is refused with 403, whatever
 * else the route allows. For the open reads (AGENTS.md, "Reads are open to
 * every signed-in user") over desk data a partner never needs — an
 * operator's contacts and terms. Identity, like `isPartner`: never switchable.
 *
 * On a controller it covers every route; on a handler, that route.
 */
export const StaffOnly = () => SetMetadata(STAFF_ONLY_KEY, true);
