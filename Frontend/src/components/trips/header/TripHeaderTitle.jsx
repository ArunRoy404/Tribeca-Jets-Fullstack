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
          {trip?.isArchived && <StatusBadge status="Archived" bordered />}
        </div>
        <p className="font-montserrat text-[13px] text-muted-foreground truncate">
          {trip?.route} · {trip?.departure}
        </p>
      </div>
    </div>
  );
}
