import { FileText } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import { cn } from "@/lib/utils";

export default function TripDocumentsCard({ trip }) {
  return (
    <DetailCard
      title="Documents"
      action={
        <button type="button" className="font-montserrat font-semibold text-[12px] text-purple cursor-pointer">
          Manage
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {trip?.documents?.map((doc) => (
          <div key={doc?.label} className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-sm bg-destructive/10 text-destructive size-8 shrink-0">
              <FileText className="size-4" />
            </div>
            <div className="flex flex-col">
              <p className="font-montserrat font-medium text-[13px] text-foreground">{doc?.label}</p>
              <p className={cn("font-montserrat text-[11px]", doc?.available ? "text-success" : "text-muted-foreground")}>
                {doc?.available ? "Available" : "Pending"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
