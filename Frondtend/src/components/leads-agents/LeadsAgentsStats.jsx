"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";

export default function LeadsAgentsStats() {
  const stats = useLeadsAgentsStore((s) => s.kpiStats);
  return <SimpleStatsRow stats={stats} />;
}

