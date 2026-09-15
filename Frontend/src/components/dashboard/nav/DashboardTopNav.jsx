"use client";

import TopNav from "./TopNav";
import { useCurrentUser } from "@/hooks/auth";
import { toDisplayUser } from "@/lib/user";

/**
 * Adapter between the API's user shape and TopNav's display props.
 *
 * `useCurrentUser` is deduped by React Query, so this and the sidebar's
 * NavUser share a single request despite both reading the session.
 */
export default function DashboardTopNav() {
  const { data: user, isLoading } = useCurrentUser();

  return <TopNav user={toDisplayUser(user, { isLoading })} />;
}
