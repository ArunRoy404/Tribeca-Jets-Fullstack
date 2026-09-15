"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useItinerariesStore } from "@/store/useItinerariesStore";

export default function ItinerariesStats() {
  const stats = useItinerariesStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
