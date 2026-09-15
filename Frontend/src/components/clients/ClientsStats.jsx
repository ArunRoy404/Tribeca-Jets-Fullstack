"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useClientsStore } from "@/store/useClientsStore";

export default function ClientsStats() {
  const stats = useClientsStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
