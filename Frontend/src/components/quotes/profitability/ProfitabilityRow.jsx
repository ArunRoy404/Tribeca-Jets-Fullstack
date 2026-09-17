"use client";

import { cn } from "@/lib/utils";

export default function ProfitabilityRow({ label, value, tone = "foreground", isLast = false }) {
  const toneClasses = {
    foreground: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    purple: "text-purple",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2",
        !isLast && "border-b border-border/40"
      )}
    >
      <span className="font-montserrat text-[13px] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-montserrat font-bold text-[14px] sm:text-[15px]",
          toneClasses[tone] || "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
