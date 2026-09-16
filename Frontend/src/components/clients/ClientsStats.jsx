"use client";

import { useMemo } from "react";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useClientStats } from "@/hooks/clients";

/**
 * The four tiles above the table.
 *
 * Scoped server-side: a broker's tiles count their own book, so the numbers
 * always agree with the rows underneath them. Every value comes from the API —
 * an em dash while it loads, never a placeholder figure.
 */
export default function ClientsStats() {
  const { data, isPending } = useClientStats();

  const stats = useMemo(() => {
    const show = (value) => (isPending ? "—" : String(value ?? 0));
    const total = data?.total ?? 0;
    const activeAndVip = data?.activeAndVip ?? 0;
    const share =
      !isPending && total > 0
        ? `${Math.round((activeAndVip / total) * 100)}% of total`
        : "of total";

    return [
      { label: "Total Clients", value: show(total), meta: "in database", tone: "foreground" },
      { label: "Active & VIP", value: show(activeAndVip), meta: share, tone: "info" },
      {
        label: "Follow-ups Due",
        value: show(data?.followUpsDue),
        meta: "overdue or today",
        tone: "destructive",
      },
      {
        label: data?.year ? `Added in ${data.year}` : "Added this year",
        value: show(data?.addedThisYear),
        meta: "new this year",
        tone: "success",
      },
    ];
  }, [data, isPending]);

  return <SimpleStatsRow stats={stats} />;
}
