"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/common/FullPageLoader";
import { useCurrentUser } from "@/hooks/auth";
import { homeFor, isPartnerRole } from "@/lib/roles";

/**
 * Keeps each kind of user in their own half of the app: staff in the CRM,
 * referral agents (#11) in the partner portal.
 *
 * The proxy can only tell whether a session exists — the role is in
 * `/auth/me`, which it cannot read — so this runs in the layouts once the
 * session is known. It is **not** the security boundary: the API refuses a
 * referral agent every CRM endpoint whatever this renders. It is what keeps an
 * agent from landing on a dashboard whose every panel answers 403, and a
 * broker from wandering into a portal built for somebody else.
 *
 * `area` is "staff" or "partner". The staff side renders straight away, as the
 * dashboard always has — sign-in has already seeded the user, so a partner is
 * recognised on the first render and never sees a CRM panel. The partner side
 * waits for the session, because the portal has nothing to show a stranger.
 */
export default function AreaGate({ area, children }) {
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();

  const partner = isPartnerRole(user?.role);
  // By the real role, whatever the temporary switch says — see `homeFor`.
  const misplaced = Boolean(user) && (area === "partner" ? !partner : partner);

  useEffect(() => {
    if (misplaced) router.replace(homeFor(user?.role));
  }, [misplaced, router, user?.role]);

  if (misplaced) return <FullPageLoader label="Taking you to your workspace…" />;
  if (area === "partner" && isPending) return <FullPageLoader label="Opening your referral portal…" />;
  return children;
}
