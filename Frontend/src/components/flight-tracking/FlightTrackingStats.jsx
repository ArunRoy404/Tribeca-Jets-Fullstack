"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useFlightTrackingStore } from "@/store/useFlightTrackingStore";

export default function FlightTrackingStats() {
  const { stats } = useFlightTrackingStore();
  return <SimpleStatsRow stats={stats} />;
}
