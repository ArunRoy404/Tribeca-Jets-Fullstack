import { Check } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import { cn } from "@/lib/utils";

export default function TripConfirmationCard({ trip }) {
  return (
    <DetailCard title="Confirmation">
      <div className="flex flex-col gap-3">
        {trip?.confirmation?.map((item) => (
          <div key={item?.label} className="flex items-center justify-between gap-2">
            <p className="font-montserrat text-[13px] text-foreground">{item?.label}</p>
            <div
              className={cn(
                "flex items-center justify-center rounded-full size-4 shrink-0",
                item?.done ? "bg-success text-white" : "bg-secondary text-muted-foreground"
              )}
            >
              <Check className="size-2.5" />
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
