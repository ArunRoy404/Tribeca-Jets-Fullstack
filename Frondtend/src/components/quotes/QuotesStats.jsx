"use client";

import { useMemo } from "react";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useQuotesStore } from "@/store/useQuotesStore";

export default function QuotesStats() {
  const quotes = useQuotesStore((s) => s.quotes);

  const stats = useMemo(() => {
    const totalQuotes = quotes.length;
    const awaitingResponse = quotes.filter(
      (q) => q.status === "Sent" || q.status === "Viewed"
    ).length;
    const approved = quotes.filter((q) => q.status === "Approved").length;
    const totalValueNum = quotes.reduce((acc, q) => acc + (q.totalPrice || 0), 0);
    const totalValue = `$${totalValueNum.toLocaleString()}`;

    return [
      { label: "TOTAL QUOTES", value: String(totalQuotes), tone: "foreground" },
      { label: "AWAITING RESPONSE", value: String(awaitingResponse), tone: "warning" },
      { label: "APPROVED", value: String(approved), tone: "success" },
      { label: "TOTAL VALUE", value: totalValue, tone: "foreground" },
    ];
  }, [quotes]);

  return <SimpleStatsRow stats={stats} />;
}

