"use client";

export default function QuoteHeaderTitle({ quote }) {
  if (!quote) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="font-montserrat font-bold text-[22px] sm:text-[26px] text-foreground tracking-tight">
          {quote.id}
        </h1>
        {quote.clientTier === "VIP" && (
          <span className="px-2 py-0.5 rounded font-montserrat font-bold text-[11px] bg-warning/15 text-warning border border-warning/30">
            VIP
          </span>
        )}
      </div>
      <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground">
        {quote.version || "V1"} · Sent {quote.sentDate || "—"}
      </p>
    </div>
  );
}
