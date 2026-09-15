import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProgressStepper({ steps = [], currentIndex = 0 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 xl:grid-cols-14 gap-2 sm:gap-2.5 w-full">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const isQuoteSent = step === "Quote Sent";

        return (
          <div
            key={step}
            className={cn(
              "flex flex-col justify-between p-2.5 rounded-lg border min-h-[76px] w-full transition-colors",
              current
                ? "border-primary/20 bg-secondary/80 shadow-xs"
                : done
                ? "border-border bg-secondary/40"
                : "border-border/60 bg-white"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <div
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  done && "bg-warning",
                  current && "bg-info",
                  !done && !current && "bg-border"
                )}
              />
              {isQuoteSent && <Plane className="size-3.5 text-info rotate-45 shrink-0" />}
            </div>

            <p
              className={cn(
                "font-montserrat text-[11px] font-medium leading-snug my-1",
                !done && !current ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {step}
            </p>

            <div className="min-h-[14px]">
              {done && <span className="font-montserrat font-bold text-[10px] text-success">Done</span>}
              {current && <span className="font-montserrat font-bold text-[10px] text-warning">Current</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
