"use client";

import { cn } from "@/lib/utils";

export default function QuoteBreakdownRow({ label, amount, type = "currency" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="font-montserrat text-[13px] sm:text-[14px] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-montserrat text-[13px] sm:text-[14px]",
          type === "currency" ? "font-bold text-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {amount}
      </span>
    </div>
  );
}
