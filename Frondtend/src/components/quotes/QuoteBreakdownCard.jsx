"use client";

import { cn } from "@/lib/utils";

export default function QuoteBreakdownCard({ quote }) {
  const lineItems = quote.lineItems || [
    { label: "Base Charter Price", amount: quote.basePriceFormatted, type: "currency" },
    ...(quote.fetEnabled
      ? [{ label: "Federal Excise Tax (7.5%)", amount: quote.fetFormatted, type: "currency" }]
      : []),
    { label: "Catering (Seafood Premium)", amount: "Included", type: "text" },
    { label: "Ground Transportation", amount: "Included", type: "text" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full rounded-lg border border-border bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Quote Breakdown
        </h3>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {lineItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-4 py-1.5 border-b border-border/40 last:border-0"
          >
            <span className="font-montserrat text-[13px] sm:text-[14px] text-muted-foreground">
              {item.label}
            </span>
            <span
              className={cn(
                "font-montserrat font-semibold text-[13px] sm:text-[14px]",
                item.type === "currency" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.amount}
            </span>
          </div>
        ))}

        {/* Highlighted Total Price Row */}
        <div className="flex items-center justify-between gap-4 p-3 sm:p-4 mt-2 rounded-md bg-[#E8FAF3] border border-success/20">
          <span className="font-montserrat font-bold text-[14px] sm:text-[15px] text-foreground">
            Total Price
          </span>
          <span className="font-montserrat font-bold text-[16px] sm:text-[18px] text-success">
            {quote.totalPriceFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}

