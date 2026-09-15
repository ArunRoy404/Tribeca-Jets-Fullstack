"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";

export default function EmptyLegsStats() {
  const stats = useEmptyLegsStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
