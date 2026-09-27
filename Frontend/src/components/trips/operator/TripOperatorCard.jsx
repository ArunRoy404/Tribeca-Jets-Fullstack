import Link from "next/link";
import { ExternalLink } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import DetailCard from "@/components/trips/DetailCard";

function InfoField({ label, value }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="font-montserrat text-[12px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className="font-montserrat font-bold text-[14px] text-foreground truncate">{value}</div>
    </div>
  );
}

/**
 * Operator, aircraft and the operator's confirmation — a real fact with a
 * date now, not "Confirmed" derived from the trip's own status. The
 * registration is the fleet tail, or a dash; it used to read "N1040TJ" for
 * every trip in the system.
 */
export default function TripOperatorCard({ trip }) {
  return (
    <DetailCard
      title="Operator & Aircraft"
      action={
        trip?.operatorId ? (
          <Link href={`/dashboard/operators/${trip.operatorId}`} className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-purple">
            View Operator
            <ExternalLink className="size-3" />
          </Link>
        ) : null
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoField label="Operator" value={trip?.operator} />
        <InfoField label="Aircraft" value={trip?.aircraft} />
        <InfoField
          label="Operator Confirmation"
          value={<StatusBadge status={trip?.operatorConfirmed ? "Confirmed" : "Pending"} bordered />}
        />
        <InfoField label="Registration" value={trip?.registration ?? "—"} />
      </div>
    </DetailCard>
  );
}
