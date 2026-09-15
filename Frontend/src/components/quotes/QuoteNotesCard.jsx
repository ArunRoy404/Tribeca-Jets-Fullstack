"use client";

export default function QuoteNotesCard({ quote }) {
  return (
    <div className="flex flex-col gap-4 w-full rounded-lg border border-border bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Notes
        </h3>
      </div>

      <div className="text-[13px] font-montserrat text-muted-foreground leading-relaxed">
        {quote.notes || "No additional notes provided for this quote."}
      </div>
    </div>
  );
}

