"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";

export default function UsersRolesStats() {
  const stats = useUsersRolesStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
