import { cn } from "@/lib/utils";

export default function ChartTooltip({ label, rows, align = "center" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[calc(100%+8px)] z-10 flex w-max flex-col gap-2 rounded-lg bg-white p-2 shadow-lg",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "start" && "left-0",
        align === "end" && "right-0"
      )}
    >
      <span className="w-fit rounded bg-secondary px-2 py-1 font-montserrat font-medium text-[10px] text-foreground whitespace-nowrap">
        {label}
      </span>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-1 font-montserrat font-medium text-[10px] text-foreground whitespace-nowrap">
          <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
          {row.label} {row.value}
        </p>
      ))}
    </div>
  );
}
