"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useItineraryStats } from "@/hooks/itineraries";

const dash = (value) => (value === undefined || value === null ? "—" : String(value));

export default function ItinerariesStats() {
  const { data } = useItineraryStats();

  const stats = [
    { label: "TOTAL ITINERARIES", value: dash(data?.total), tone: "foreground" },
    { label: "CONFIRMED", value: dash(data?.confirmed), tone: "success" },
    { label: "PENDING", value: dash(data?.pending), tone: "warning" },
  ];

  return <SimpleStatsRow stats={stats} />;
}
