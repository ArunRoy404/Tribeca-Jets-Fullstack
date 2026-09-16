"use client";

import { useMemo } from "react";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useUserStats } from "@/hooks/users";

/**
 * Headcount tiles above the users table.
 *
 * Counts come from the API rather than from the loaded page, which would only
 * ever describe the ten rows currently on screen.
 */
export default function UsersRolesStats() {
  const { data, isPending } = useUserStats();

  const stats = useMemo(
    () => [
      // An em dash while loading, not a zero: "0 users" is a claim, and it is
      // wrong for the moment it is on screen.
      { label: "TOTAL USERS", value: isPending ? "—" : String(data?.total ?? 0), tone: "foreground" },
      { label: "ACTIVE", value: isPending ? "—" : String(data?.active ?? 0), tone: "success" },
      { label: "INVITED", value: isPending ? "—" : String(data?.invited ?? 0), tone: "warning" },
      { label: "SUSPENDED", value: isPending ? "—" : String(data?.suspended ?? 0), tone: "destructive" },
      { label: "ADMINS", value: isPending ? "—" : String(data?.admins ?? 0), tone: "purple" },
      { label: "BROKERS", value: isPending ? "—" : String((data?.brokers ?? 0) + (data?.seniorBrokers ?? 0)), tone: "foreground" },
    ],
    [data, isPending],
  );

  return <SimpleStatsRow stats={stats} />;
}
