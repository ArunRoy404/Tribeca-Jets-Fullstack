"use client";

import DetailCard from "@/components/quotes/DetailCard";

export default function QuoteNotesCard({ quote }) {
  if (!quote) return null;

  return (
    <DetailCard title="Notes">
      <div className="text-[13px] font-montserrat text-muted-foreground leading-relaxed">
        {quote.notes || "No additional notes provided for this quote."}
      </div>
    </DetailCard>
  );
}
