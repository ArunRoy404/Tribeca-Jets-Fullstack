"use client";

import Link from "next/link";
import DetailCard from "@/components/trips/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { useCommissions } from "@/hooks/commissions";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toCommissionRow } from "@/lib/commission";
import { cn } from "@/lib/utils";

function StatBox({ label, value, tone = "foreground", highlight }) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:gap-1 rounded-sm border border-border p-2.5 sm:p-3 min-w-0", highlight && "bg-success/10")}>
      <p className="font-montserrat text-[10px] sm:text-[12px] text-muted-foreground truncate">{label}</p>
      <p className={cn("font-montserrat font-bold text-[14px] sm:text-[18px] truncate", tone === "success" ? "text-success" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

/**
 * The trip's money, every figure the server's. This card used to derive the
 * operator cost as profit × 3.2 and a commission as 15% of profit — numbers
 * nobody entered, printed as if they were the books.
 *
 * Paid and balance need Receivables (#16) and read as a dash until then.
 * Commissions are live since the Commissions module shipped: the ones raised
 * on this trip, each with the value the API computed — listed, not summed
 * here, because a total of estimates and settled figures is a number nobody
 * agreed. Operator cost, profit and margin are dashes for a role without
 * VIEW_FINANCIALS.
 */
export default function TripFinancialCard({ trip }) {
  const f = trip?.financial ?? {};
  const { can } = usePermissions();
  const mayViewCommissions = can(Permission.VIEW_COMMISSIONS);
  const { data } = useCommissions({ tripId: trip?.id, limit: 20 }, { enabled: Boolean(trip?.id) && mayViewCommissions });
  const commissions = (data?.data ?? []).map(toCommissionRow);

  return (
    <DetailCard title="Financial Summary" description="Computed by the server from the price, FET and the operator's cost.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatBox label="Client Total" value={f.total} />
        <StatBox label="Client Paid" value="—" />
        <StatBox label="Client Balance" value="—" />
        <StatBox label="Operator Cost" value={f.operatorCost} />
        <StatBox label="Gross Profit" value={f.grossProfit} tone="success" highlight />
        <StatBox label="Margin" value={f.margin} />
        <StatBox label="FET" value={f.fet} />
        <StatBox label="Commissions" value={mayViewCommissions && data ? String(data.meta?.total ?? 0) : "—"} />
      </div>

      {mayViewCommissions && commissions.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {commissions.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 font-montserrat text-[12px]"
            >
              <span className="min-w-0 truncate">
                <Link href={`/dashboard/commissions?commission=${row.id}`} className="font-semibold text-purple hover:underline">
                  {row.reference}
                </Link>{" "}
                · {row.recipient} · {row.structure}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-foreground">{row.amount}</span>
                <StatusBadge status={row.status} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="font-montserrat text-[11px] text-muted-foreground">
        Client payments appear once Receivables records them against this trip.
      </p>
    </DetailCard>
  );
}
