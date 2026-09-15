import Link from "next/link";
import { ExternalLink } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import DetailCard from "@/components/trips/DetailCard";
import { cn } from "@/lib/utils";

function StatBox({ label, value, tone = "foreground", highlight }) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:gap-1 rounded-sm border border-border p-2.5 sm:p-3 min-w-0", highlight && "bg-success/10")}>
      <p className="font-montserrat text-[10px] sm:text-[12px] text-muted-foreground truncate">{label}</p>
      <p
        className={cn(
          "font-montserrat font-bold text-[14px] sm:text-[18px] truncate",
          tone === "success" ? "text-success" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function TripFinancialCard({ trip }) {
  return (
    <DetailCard
      title="Financial Summary"
      description="FET & commission included"
      action={
        <Link href="/dashboard/receivables" className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-purple">
          Full Finance
          <ExternalLink className="size-3" />
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatBox label="Client Quote" value={trip?.financial?.clientQuote} />
          <StatBox label="Client Paid" value={trip?.financial?.clientPaid} />
          <StatBox label="Client Balance" value={trip?.financial?.clientBalance} />
          <StatBox label="Operator Cost" value={trip?.financial?.operatorCost} />
          <StatBox label="Gross Profit" value={trip?.financial?.grossProfit} tone="success" highlight />
          <StatBox label="Margin" value={trip?.financial?.margin} />
          <StatBox label="FET" value={trip?.financial?.fet} />
          <StatBox label="Broker Commission" value={trip?.financial?.brokerCommission} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="font-montserrat text-[12px] text-muted-foreground">Payment status</p>
          {trip?.clientPmt && <StatusBadge status={trip?.clientPmt} bordered />}
        </div>
      </div>
    </DetailCard>
  );
}
