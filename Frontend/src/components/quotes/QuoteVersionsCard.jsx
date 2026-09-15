"use client";

import { cn } from "@/lib/utils";

export default function QuoteVersionsCard({ quote }) {
  const versions = quote.versions || [
    {
      version: quote.version || "V1",
      amount: quote.totalPriceFormatted,
      note: "Initial Quote",
      date: quote.sentDate || "Aug 10",
      isCurrent: true,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full rounded-lg border border-border bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Quote Versions
        </h3>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {versions.map((ver, idx) => {
          const isLatest = idx === 0 || ver.isCurrent;
          return (
            <div
              key={idx}
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
                    "px-2 py-0.5 rounded text-[11px] font-bold shrink-0",
                    isLatest
                      ? "bg-purple/15 text-purple border border-purple/30"
                      : "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {ver.version}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-montserrat font-bold text-[14px] text-foreground">
                    {ver.amount}
                  </span>
                  <span className="font-montserrat text-[12px] text-muted-foreground truncate">
                    {ver.note}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="font-montserrat text-[12px] text-muted-foreground">
                  {ver.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

