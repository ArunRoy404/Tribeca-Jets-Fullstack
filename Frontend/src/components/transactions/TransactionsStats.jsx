"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { useTransactionStats, useTransactionsTableParams } from "@/hooks/transactions";
import { formatMoney } from "@/lib/money";

/**
 * The ledger's tiles, summed by the API in cents over the same filters as the
 * rows below them. A side the caller may not see comes back null and reads as
 * a dash, and so does the net — half a picture is not a net. Paid commissions
 * whose value cannot be known are counted, never summed; the last tile says
 * how many there are.
 */
export default function TransactionsStats() {
  const params = useTransactionsTableParams();
  const { data } = useTransactionStats(params.statsParams);
  const money = (v) => (v === null || v === undefined ? "—" : formatMoney(v));
  const count = (kind) => (data ? String(data.byKind?.[kind]?.count ?? 0) : "—");

  const stats = [
    { label: "MONEY IN", value: money(data?.moneyIn), tone: "success" },
    { label: "MONEY OUT", value: money(data?.moneyOut), tone: "destructive" },
    { label: "NET", value: money(data?.net), tone: "foreground" },
    { label: "CLIENT PAYMENTS", value: count("CLIENT_PAYMENT"), tone: "success" },
    { label: "OPERATOR PAYMENTS", value: count("OPERATOR_PAYMENT"), tone: "warning" },
    { label: "COMMISSIONS PAID", value: count("COMMISSION"), tone: "info" },
  ];

  return (
    <div className="flex flex-col gap-2 w-full">
      <SimpleStatsRow stats={stats} />
      {data?.unvalued > 0 && (
        <p className="font-montserrat text-[12px] text-muted-foreground">
          {data.unvalued} paid {data.unvalued === 1 ? "commission has" : "commissions have"} no known value yet (a share of a profit
          nobody has entered) and {data.unvalued === 1 ? "is" : "are"} not in Money Out.
        </p>
      )}
    </div>
  );
}
