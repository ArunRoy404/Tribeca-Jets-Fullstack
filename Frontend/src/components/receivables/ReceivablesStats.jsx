"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useReceivableStats } from "@/hooks/receivables";
import { formatMoney } from "@/lib/money";

/**
 * The tiles, summed by the API in cents over the caller's scope. A draft is
 * not invoiced — the client has not seen it — and a cancelled invoice is owed
 * by nobody, so neither is in the invoiced or outstanding figures.
 */
export default function ReceivablesStats() {
  const { data } = useReceivableStats();
  const money = (v) => (data ? formatMoney(v) : "—");

  const stats = [
    { label: "TOTAL OUTSTANDING", value: money(data?.outstanding), tone: "destructive" },
    { label: "OVERDUE", value: money(data?.overdue), tone: "destructive" },
    { label: "OVERDUE INVOICES", value: data ? String(data.overdueCount) : "—", tone: "warning" },
    { label: "TOTAL COLLECTED", value: money(data?.collected), tone: "success" },
    { label: "TOTAL INVOICED", value: money(data?.invoiced), tone: "foreground" },
  ];

  return <SimpleStatsRow stats={stats} gridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />;
}
