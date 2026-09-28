"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import TripsContainer from "@/components/table/trips/TripsContainer";
import { useTripStats } from "@/hooks/trips";
import { formatMoney } from "@/lib/money";

const DASH = "—";

/**
 * The board and its tiles, both from the API. Revenue and profit are summed by
 * the server from computed totals; they are absent for a role without
 * VIEW_FINANCIALS and read as a dash. "Payment Attention" counts the trips with
 * an overdue client invoice (Receivables, #16), and is a dash for a role that
 * may not read receivables.
 */
export default function TripsPage() {
  const { data: stats } = useTripStats();
  const count = (value) => (value === null || value === undefined ? DASH : String(value));
  const money = (value) => (value === null || value === undefined ? DASH : formatMoney(value));

  const tiles = [
    { label: "Active Trips", value: count(stats?.active), tone: "foreground" },
    { label: "In Flight", value: count(stats?.inFlight), tone: "warning" },
    { label: "Confirmed / Booked", value: count(stats?.confirmedOrBooked), tone: "info" },
    { label: "Payment Attention", value: count(stats?.paymentAttention), tone: "destructive" },
    { label: "Total Revenue", value: money(stats?.totalRevenue), tone: "foreground" },
    { label: "Total Profit", value: money(stats?.totalProfit), tone: "success" },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={tiles} />
      <TripsContainer />
    </div>
  );
}
