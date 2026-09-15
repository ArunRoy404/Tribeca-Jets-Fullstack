"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";

export default function OperatorPaymentsStats() {
  const stats = useOperatorPaymentsStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
