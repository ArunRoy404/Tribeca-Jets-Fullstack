import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

export default function TripHeaderTitle({ trip, backUrl = "/dashboard/trips" }) {
  if (!trip) return null;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Link href={backUrl} className="flex items-center justify-center rounded-sm border border-border size-7 shrink-0 hover:bg-muted">
        <ChevronLeft className="size-4" />
      </Link>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-montserrat font-bold text-[20px] text-purple">{trip?.reference}</p>
          {trip?.status && <StatusBadge status={trip?.status} bordered />}
          {trip?.approvalStatus === "PENDING" && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              Pending Approval
            </span>
          )}
          {trip?.approvalStatus === "REJECTED" && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/40">
              Approval Declined
            </span>
          )}
          {trip?.isArchived && <StatusBadge status="Archived" bordered />}
        </div>
        <p className="font-montserrat text-[13px] text-muted-foreground truncate">
          {trip?.route} · {trip?.departure}
        </p>
      </div>
    </div>
  );
}
