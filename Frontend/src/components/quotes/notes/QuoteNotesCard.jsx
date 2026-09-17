"use client";

import DetailCard from "@/components/quotes/DetailCard";

/**
 * Two kinds of text, kept apart on purpose: the terms print on the quote the
 * client reads, the notes never leave the desk. Merging them into one "Notes"
 * block is how an internal remark ends up on a client-facing document.
 */
export default function QuoteNotesCard({ quote }) {
  if (!quote) return null;

  return (
    <DetailCard title="Terms & Notes">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <p className="font-montserrat font-semibold text-[12px] text-foreground uppercase tracking-wide">
            Terms · shown to the client
          </p>
          <p className="text-[13px] font-montserrat text-muted-foreground leading-relaxed">
            {quote.terms || "No terms set on this quote."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 pt-3 border-t border-border/50">
          <p className="font-montserrat font-semibold text-[12px] text-foreground uppercase tracking-wide">
            Internal notes · never sent
          </p>
          <p className="text-[13px] font-montserrat text-muted-foreground leading-relaxed">
            {quote.notes || "No internal notes on this quote."}
          </p>
        </div>

        {quote.decisionNote && (
          <div className="flex flex-col gap-1.5 pt-3 border-t border-border/50">
            <p className="font-montserrat font-semibold text-[12px] text-foreground uppercase tracking-wide">
              Decision
            </p>
            <p className="text-[13px] font-montserrat text-muted-foreground leading-relaxed">
              {quote.decisionNote}
            </p>
          </div>
        )}
      </div>
    </DetailCard>
  );
}
