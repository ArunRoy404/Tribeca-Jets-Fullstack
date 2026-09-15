import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

export default function TripHeaderTitle({ trip, backUrl = "/dashboard/trips" }) {
  if (!trip) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={backUrl}
        className="flex items-center justify-center rounded-sm border border-border size-7 shrink-0 hover:bg-muted"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <p className="font-montserrat font-bold text-[20px] text-purple">{trip?.id}</p>
      {trip?.status && <StatusBadge status={trip?.status} bordered />}
      {trip?.clientPmt && <StatusBadge status={trip?.clientPmt} bordered />}
      <p className="font-montserrat text-[14px] text-muted-foreground whitespace-nowrap">
        {trip?.fromCode} → {trip?.toCode} · {trip?.departure}
      </p>
    </div>
  );
}
