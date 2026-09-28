"use client";

import TopNav from "@/components/dashboard/nav/TopNav";
import { useCurrentUser } from "@/hooks/auth";
import { toDisplayUser } from "@/lib/user";
import { portalTitleFor } from "./portalNav";

/** The CRM's header, with the portal's titles and without the desk's bell. */
export default function PortalTopNav() {
  const { data: user, isLoading } = useCurrentUser();

  return <TopNav user={toDisplayUser(user, { isLoading })} titleFor={portalTitleFor} showNotifications={false} />;
}
