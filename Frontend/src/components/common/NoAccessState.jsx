"use client";

import { Lock } from "lucide-react";
import NotFoundState from "@/components/common/NotFoundState";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useHydrated } from "@/hooks/common/useHydrated";
import { firstAllowedHref, moduleLabel } from "@/components/dashboard/nav/crmNav";

/**
 * "You do not have this page" — shown by `ModuleGate` in place of a page,
 * and at `/dashboard/no-access`, where `proxy.js` sends a request for one.
 * The way out is the first page this person may open, or My Account when
 * they have none.
 */
export default function NoAccessState({ module }) {
  const { canAccess } = usePermissions();
  // The server renders before the session is known, so the way out is My
  // Account until the browser has hydrated and can read the permissions.
  const hydrated = useHydrated();
  const fallback = hydrated ? firstAllowedHref(canAccess) : null;
  const label = moduleLabel(module);

  return (
    <NotFoundState
      icon={Lock}
      title={label ? `No access to ${label}` : "No access to this page"}
      message="Your permissions do not include this page. Ask an administrator if you need it."
      backUrl={fallback ?? "/dashboard/account"}
      backLabel={fallback ? "Go to an allowed page" : "Go to My Account"}
    />
  );
}
