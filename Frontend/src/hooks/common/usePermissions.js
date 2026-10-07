"use client";

import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/auth";
import { ROLE_RESTRICTIONS_ENABLED, Scope, can, canWrite } from "@/lib/permissions";
import { Action, hasAccess } from "@/lib/access";

/**
 * What the signed-in user's role is allowed to do.
 *
 * Reads the matrix row the API ships with `/auth/me` rather than deriving it
 * from `role` — the server owns the matrix, and a second copy here would drift
 * the first time a scope changed.
 *
 * Use it to stop offering actions the guard would refuse. An assistant seeing
 * Edit and Remove on every row and collecting a 403 toast reads as a broken
 * app, not as a permission boundary.
 *
 * **Never the enforcement point.** It renders buttons; the API re-checks the
 * same matrix on every route.
 *
 * While the session is still loading every answer is `false`, so a control
 * cannot flash into view and then vanish — better a button that appears a
 * moment late than one that appears and is taken away.
 *
 * Two vocabularies live here while modules move over one at a time:
 *
 * - **`canAccess(module, action)` / `reachOf(module)`** — the person's own
 *   permissions (7 Oct 2026), from `/auth/me`'s `permissions`. Always
 *   enforced: the sidebar, the page gate and every module already moved
 *   (Users & Roles) read these.
 * - **`can` / `canWrite` / `scopeFor`** — the old role matrix (`matrix`),
 *   for modules not yet moved. Answers yes to everything while
 *   ROLE_RESTRICTIONS_ENABLED is off.
 *
 * @example
 *   const { canAccess } = usePermissions();
 *   const mayInvite = canAccess(Module.USERS, Action.CREATE);
 */
export function usePermissions() {
  const { data: user, isPending } = useCurrentUser();

  return useMemo(() => {
    const permissions = user?.permissions ?? {};
    const access = {
      /** The person's own `{ MODULE: { reach, actions } }`. */
      permissions,
      canAccess: (module, action = Action.VIEW) => !isPending && hasAccess(permissions, module, action),
      /** "OWN" / "ASSIGNED" / "ALL", or null without access. */
      reachOf: (module) => permissions?.[module]?.reach ?? null,
    };

    // Restrictions off: every role may do everything in the modules still on
    // the old matrix, with no wait for the session. See ROLE_RESTRICTIONS_ENABLED.
    if (!ROLE_RESTRICTIONS_ENABLED) {
      return {
        ...access,
        isPending,
        scopeFor: () => Scope.ALL,
        can: () => true,
        canWrite: () => true,
      };
    }

    const matrix = user?.matrix ?? {};
    const scopeFor = (permission) => matrix[permission] ?? Scope.NONE;

    return {
      ...access,
      isPending,
      /** The raw scope, for the rare case a component needs OWN vs ALL. */
      scopeFor,
      can: (permission) => !isPending && can(scopeFor(permission)),
      canWrite: (permission) => !isPending && canWrite(scopeFor(permission)),
    };
  }, [user?.permissions, user?.matrix, isPending]);
}
