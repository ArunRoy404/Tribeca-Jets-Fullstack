"use client";

import { cn } from "@/lib/utils";

export default function QuoteVersionItem({ version, amount, note, date, isLatest }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3.5 rounded-lg border transition-colors",
        isLatest
          ? "border-purple/30 bg-purple/5"
          : "border-border/60 bg-white hover:bg-muted/20"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[11px] font-bold shrink-0 font-montserrat",
            isLatest
              ? "bg-purple/15 text-purple border border-purple/30"
              : "bg-muted text-muted-foreground border border-border"
          )}
        >
          {version}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-montserrat font-bold text-[14px] text-foreground">
            {amount}
          </span>
          <span className="font-montserrat text-[12px] text-muted-foreground truncate">
            {note}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className="font-montserrat text-[12px] text-muted-foreground">
          {date}
        </span>
      </div>
    </div>
  );
}
