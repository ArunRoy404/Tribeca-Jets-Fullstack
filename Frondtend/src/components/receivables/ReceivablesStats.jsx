"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useReceivablesStore } from "@/store/useReceivablesStore";

export default function ReceivablesStats() {
  const stats = useReceivablesStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
