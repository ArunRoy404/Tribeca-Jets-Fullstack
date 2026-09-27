import { cn } from "@/lib/utils";
import { TRIP_TYPES, formatTripType } from "@/lib/trip";

/** One Way / Round Trip / Multi Leg. The value is the API's enum; the label is for reading. */
export default function TripTypeToggle({ value, onChange }) {
  return (
    <div className="flex w-full rounded-sm border border-border overflow-hidden bg-secondary">
      {TRIP_TYPES.map((type) => (
        <button
          type="button"
          key={type}
          onClick={() => onChange?.(type)}
          className={cn(
            "flex-1 py-2 text-center font-montserrat text-[13px] cursor-pointer",
            value === type ? "bg-white font-bold text-foreground" : "text-muted-foreground"
          )}
        >
          {formatTripType(type)}
        </button>
      ))}
    </div>
  );
}
