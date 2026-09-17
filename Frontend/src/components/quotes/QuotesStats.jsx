"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useQuoteStats } from "@/hooks/quotes";
import { formatMoney } from "@/lib/lead";
import { formatMargin } from "@/lib/quote";

/**
 * The tiles above the quotes board.
 *
 * Every figure is counted by the API from the quotes in the caller's scope, so
 * the tiles always agree with the rows underneath them.
 *
 * `averageMargin` arrives **null, not 0**, in two cases that both have to read
 * as blank: nothing has an operator cost recorded yet, or the caller does not
 * hold VIEW_FINANCIALS. "We make nothing" and "we have not priced the cost
 * side" are different statements, and only one of them is ever true here.
 */
export default function QuotesStats() {
  const { data } = useQuoteStats();

  const stats = [
    { label: "TOTAL QUOTES", value: data?.total ?? "—", tone: "foreground" },
    {
      label: "AWAITING RESPONSE",
      value: data?.awaitingResponse ?? "—",
      tone: "warning",
    },
    { label: "APPROVED", value: data?.approved ?? "—", tone: "success" },
    {
      label: "TOTAL VALUE",
      value: data ? formatMoney(data.totalValue) : "—",
      tone: "foreground",
    },
    {
      label: "AVG MARGIN",
      value: formatMargin(data?.averageMargin),
      tone: "purple",
    },
  ];

  return <SimpleStatsRow stats={stats} />;
}
