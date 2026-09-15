"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useCommissionsStore } from "@/store/useCommissionsStore";

export default function CommissionsStats() {
  const stats = useCommissionsStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
