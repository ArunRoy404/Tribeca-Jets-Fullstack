import { cn } from "@/lib/utils";

export default function FlightInfoBox({ label, value, description, status, statusTone = "muted" }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-md border border-border bg-secondary/40 p-4 min-w-0">
      <div className="flex flex-col gap-1">
        <p className="font-montserrat text-[12px] text-muted-foreground truncate">{label}</p>
        <p className="font-montserrat font-bold text-[18px] text-foreground truncate">{value}</p>
        <p className="font-montserrat text-[11px] text-muted-foreground">{description}</p>
      </div>
      <p
        className={cn(
          "font-montserrat font-bold text-[11px] uppercase tracking-wider",
          statusTone === "warning" ? "text-warning" : "text-muted-foreground"
        )}
      >
        {status}
      </p>
    </div>
  );
}
