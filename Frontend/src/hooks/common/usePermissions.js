"use client";

import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/auth";
import { Scope, can, canWrite } from "@/lib/permissions";

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
 * @example
 *   const { canWrite } = usePermissions();
 *   const mayEdit = canWrite(Permission.MANAGE_AIRCRAFT);
 */
export function usePermissions() {
  const { data: user, isPending } = useCurrentUser();

  return useMemo(() => {
    const matrix = user?.permissions ?? {};
    const scopeFor = (permission) => matrix[permission] ?? Scope.NONE;

    return {
      isPending,
      /** The raw scope, for the rare case a component needs OWN vs ALL. */
      scopeFor,
      can: (permission) => !isPending && can(scopeFor(permission)),
      canWrite: (permission) => !isPending && canWrite(scopeFor(permission)),
    };
  }, [user?.permissions, isPending]);
}
