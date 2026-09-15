import { MessageSquare } from "lucide-react";
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

export default function TripOperatorCard({ trip }) {
  return (
    <DetailCard
      title="Operator & Aircraft"
      action={
        <button type="button" className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-purple cursor-pointer">
          <MessageSquare className="size-3.5" />
          Contact Operator
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoField label="Operator" value={trip?.operator} />
        <InfoField label="Aircraft" value={trip?.aircraft} />
        <InfoField label="Operator Confirmation" value={<StatusBadge status={trip?.status === "Requested" ? "Pending" : "Confirmed"} bordered />} />
        <InfoField label="Registration" value="N1040TJ" />
      </div>
    </DetailCard>
  );
}
