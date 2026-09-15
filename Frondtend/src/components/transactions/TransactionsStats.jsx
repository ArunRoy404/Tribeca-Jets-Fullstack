"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useTransactionsStore } from "@/store/useTransactionsStore";

export default function TransactionsStats() {
  const stats = useTransactionsStore((s) => s.stats);
  return <SimpleStatsRow stats={stats} />;
}
