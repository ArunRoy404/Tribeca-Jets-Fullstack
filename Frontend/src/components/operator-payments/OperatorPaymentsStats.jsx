"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useOperatorPayableStats } from "@/hooks/operator-payments";
import { formatMoney } from "@/lib/money";

/**
 * The tiles, summed by the API in cents over the caller's scope. A cancelled
 * bill is owed to nobody and is in no figure. "Due this week" is bills with
 * money owing, due today or in the next six days.
 */
export default function OperatorPaymentsStats() {
  const { data } = useOperatorPayableStats();
  const money = (v) => (data ? formatMoney(v) : "—");

  const stats = [
    { label: "TOTAL OUTSTANDING", value: money(data?.outstanding), tone: "destructive" },
    { label: "OVERDUE", value: money(data?.overdue), tone: "destructive" },
    { label: "DUE THIS WEEK", value: data ? String(data.dueThisWeek) : "—", tone: "warning" },
    { label: "TOTAL PAID", value: money(data?.paid), tone: "success" },
    { label: "TOTAL PAYABLE", value: money(data?.payable), tone: "foreground" },
  ];

  return <SimpleStatsRow stats={stats} gridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />;
}
