"use client";

import { useMemo } from "react";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useTripRequestStats } from "@/hooks/trip-requests";
import { formatMoney } from "@/lib/lead";

/**
 * The tiles above the enquiry log.
 *
 * Every value comes from the API, scoped the same way the table is — a broker
 * sees their own plus anything unassigned, so the counts always agree with the
 * rows underneath them. An em dash while it loads, never a placeholder figure.
 */
export default function TripRequestStats() {
  const { data, isPending } = useTripRequestStats();

  const stats = useMemo(() => {
    const count = (value) => (isPending ? "—" : String(value ?? 0));

    return [
      { label: "TOTAL", value: count(data?.total), tone: "foreground" },
      { label: "OPEN", value: count(data?.open), tone: "info" },
      { label: "SOURCING", value: count(data?.sourcing), tone: "cyan" },
      { label: "QUOTED", value: count(data?.quoted), tone: "purple" },
      { label: "CONVERTED", value: count(data?.converted), tone: "success" },
      {
        label: "PIPELINE VALUE",
        // Summed by the API across the statuses still in play, so it is the
        // value of what is live rather than of everything ever asked for.
        // `formatMoney` renders an em dash for a missing figure, never $0 —
        // "no pipeline" and "nothing loaded yet" are different answers.
        value: isPending ? "—" : formatMoney(data?.pipelineValue),
        tone: "success",
      },
    ];
  }, [data, isPending]);

  return <SimpleStatsRow stats={stats} />;
}
