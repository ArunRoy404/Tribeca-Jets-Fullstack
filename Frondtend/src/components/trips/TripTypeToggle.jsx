import { cn } from "@/lib/utils";
import { tripTypeOptions } from "@/dummyData/createTripOptions";

export default function TripTypeToggle({ value, onChange }) {
  return (
    <div className="flex w-full rounded-sm border border-border overflow-hidden bg-secondary">
      {tripTypeOptions.map((option) => (
        <button
          type="button"
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "flex-1 py-2 text-center font-montserrat text-[13px] cursor-pointer",
            value === option ? "bg-white font-bold text-foreground" : "text-muted-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
