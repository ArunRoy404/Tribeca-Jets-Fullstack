"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";

export default function QuoteHeaderTitle({ quote }) {
  if (!quote) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="font-montserrat font-bold text-[22px] sm:text-[26px] text-foreground tracking-tight">
          {quote.reference}
        </h1>
        {quote.isVip && (
          <span className="px-2 py-0.5 rounded font-montserrat font-bold text-[11px] bg-warning/15 text-warning border border-warning/30">
            VIP
          </span>
        )}
        <StatusBadge status={quote.status} bordered />
        {quote.isRestored && (
          <RestoredBadge at={quote.restoredAt} by={quote.restoredByName} />
        )}
        {quote.isArchived && (
          <span className="px-2 py-0.5 rounded font-montserrat font-bold text-[11px] bg-muted text-muted-foreground border border-border">
            Archived
          </span>
        )}
      </div>
      <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground">
        {/* A draft has never been sent, and "Sent —" reads as a failed send
            rather than as a quote still being written. */}
        {quote.version} · {quote.rawSentAt ? `Sent ${quote.sent}` : "Not sent yet"}
        {quote.requestReference !== "—" && ` · From ${quote.requestReference}`}
      </p>
    </div>
  );
}
