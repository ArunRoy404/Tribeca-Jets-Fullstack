"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useEmptyLegStats } from "@/hooks/empty-legs";
import { formatMoney } from "@/lib/money";

/**
 * The board tiles, counted by the API. "Open value" is the sum of the priced
 * legs still on offer, and says how many had a price — a total quietly
 * missing half the legs would read as a slow week.
 */
export default function EmptyLegsStats() {
  const { data } = useEmptyLegStats();
  const value = (n) => (n === undefined || n === null ? "—" : String(n));

  const stats = [
    { label: "AVAILABLE", value: value(data?.available), tone: "success" },
    { label: "MATCHED", value: value(data?.matched), tone: "info" },
    { label: "BOOKED", value: value(data?.booked), tone: "warning" },
    {
      label: data ? `OPEN VALUE · ${data.pricedOpenCount} PRICED` : "OPEN VALUE",
      value: data ? formatMoney(data.openValue) : "—",
      tone: "foreground",
    },
  ];

  return <SimpleStatsRow stats={stats} />;
}
