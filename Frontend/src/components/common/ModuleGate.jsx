"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import NoAccessState from "@/components/common/NoAccessState";
import TableStatus from "@/components/table/common/TableStatus";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { firstAllowedHref, moduleForPath } from "@/components/dashboard/nav/crmNav";

/**
 * Keeps a person out of the CRM pages their permissions do not include
 * (7 Oct 2026) — the same check as the sidebar, read live from `/auth/me`.
 *
 * `proxy.js` refuses the same pages before they render, from the `tj_modules`
 * cookie; this is the second layer, for what the cookie cannot know yet — a
 * permission an administrator removed a moment ago, or a session that began
 * before the cookie existed. Neither is the security boundary: the API
 * refuses the same actions on every route.
 *
 * Without the Dashboard, `/dashboard` sends them to the first page they may
 * open, so sign-in never lands on a refusal.
 */
export default function ModuleGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPending } = useCurrentUser();
  const { canAccess } = usePermissions();

  const pageModule = moduleForPath(pathname);
  const allowed = !pageModule || canAccess(pageModule);
  const fallback = allowed || isPending ? null : firstAllowedHref(canAccess);
  const redirectHome = !allowed && !isPending && pathname === "/dashboard" && Boolean(fallback);

  useEffect(() => {
    if (redirectHome) router.replace(fallback);
  }, [redirectHome, fallback, router]);

  if (allowed) return children;
  if (isPending || redirectHome) return <TableStatus isLoading />;

  return <NoAccessState module={pageModule} />;
}
