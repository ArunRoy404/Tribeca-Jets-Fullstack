"use client";

import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/auth";
import { Action, hasAccess } from "@/lib/access";

/**
 * What the signed-in person may do: their own permissions, as `/auth/me`
 * ships them (`{ MODULE: { reach, actions } }`), never re-derived from
 * `role` — the server owns them, and a second copy here would drift the
 * first time one changed.
 *
 * Use it to stop offering actions the guard would refuse. An assistant seeing
 * Edit and Remove on every row and collecting a 403 toast reads as a broken
 * app, not as a permission boundary.
 *
 * **Never the enforcement point.** It renders buttons; the API re-checks the
 * same permissions on every route.
 *
 * While the session is still loading every answer is `false`, so a control
 * cannot flash into view and then vanish — better a button that appears a
 * moment late than one that appears and is taken away.
 *
 * The old role matrix (`can` / `canWrite` / `scopeFor`, `/auth/me`'s
 * `matrix`) was deleted on 10 Nov 2026, once no screen used it.
 *
 * @example
 *   const { canAccess } = usePermissions();
 *   const mayInvite = canAccess(Module.USERS, Action.CREATE);
 */
export function usePermissions() {
  const { data: user, isPending } = useCurrentUser();

  return useMemo(() => {
    const permissions = user?.permissions ?? {};
    return {
      /** The person's own `{ MODULE: { reach, actions } }`. */
      permissions,
      isPending,
      canAccess: (module, action = Action.VIEW) => !isPending && hasAccess(permissions, module, action),
      /** "OWN" / "ASSIGNED" / "ALL", or null without access. */
      reachOf: (module) => permissions?.[module]?.reach ?? null,
    };
  }, [user?.permissions, isPending]);
}
