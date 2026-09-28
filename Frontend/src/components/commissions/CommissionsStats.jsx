"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useCommissionStats } from "@/hooks/commissions";
import { formatMoney } from "@/lib/money";

/**
 * The tiles, summed by the API from each commission's computed value within
 * the caller's scope. A commission whose value cannot be known yet (a share of
 * a profit with no operator cost) is in no sum and not in the average; the
 * last tile says how many there are rather than letting the totals look
 * complete.
 */
export default function CommissionsStats() {
  const { data } = useCommissionStats();
  const money = (v) => (data ? formatMoney(v) : "—");

  const stats = [
    { label: "TOTAL", value: money(data?.total), tone: "foreground" },
    { label: "PAID", value: money(data?.paid), tone: "success" },
    { label: "EARNED · OWED", value: money(data?.earned), tone: "info" },
    { label: "PENDING", value: money(data?.pending), tone: "warning" },
    { label: "AVERAGE", value: data?.average === null || !data ? "—" : formatMoney(data.average), tone: "foreground" },
    { label: "NOT YET VALUED", value: data ? String(data.unvalued) : "—", tone: "foreground" },
  ];

  return <SimpleStatsRow stats={stats} />;
}
