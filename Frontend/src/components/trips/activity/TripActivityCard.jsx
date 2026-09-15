import { ExternalLink } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";

export default function TripActivityCard({ trip }) {
  return (
    <DetailCard
      title="Activity Timeline"
      action={
        <button type="button" className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-purple cursor-pointer">
          View all activity
          <ExternalLink className="size-3" />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {trip?.activity?.map((entry, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full bg-secondary size-7 shrink-0 font-montserrat font-bold text-[11px] text-foreground">
              {entry?.actor?.slice?.(0, 2)?.toUpperCase?.()}
            </div>
            <div className="flex flex-col">
              <p className="font-montserrat text-[13px] text-foreground">
                <span className="font-bold">{entry?.actor}</span> {entry?.action}
              </p>
              <p className="font-montserrat text-[11px] text-muted-foreground">{entry?.at}</p>
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
