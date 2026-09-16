"use client";

import { useMemo } from "react";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useAircraftStats } from "@/hooks/aircraft";

/**
 * The four tiles above the table.
 *
 * Every value comes from the API — an em dash while it loads, never a
 * placeholder figure. These were hardcoded to 6 / 4 / 1 / 1 regardless of what
 * the fleet actually contained.
 */
export default function AircraftStats() {
  const { data, isPending } = useAircraftStats();

  const stats = useMemo(() => {
    const show = (value) => (isPending ? "—" : String(value ?? 0));

    return [
      { label: "TOTAL AIRCRAFT", value: show(data?.total), meta: "in the fleet", tone: "foreground" },
      { label: "AVAILABLE", value: show(data?.available), meta: "quotable now", tone: "success" },
      { label: "IN SERVICE", value: show(data?.inService), meta: "on a trip", tone: "purple" },
      {
        label: "MAINTENANCE",
        value: show(data?.maintenance),
        meta: "grounded",
        tone: "destructive",
      },
    ];
  }, [data, isPending]);

  return <SimpleStatsRow stats={stats} />;
}
