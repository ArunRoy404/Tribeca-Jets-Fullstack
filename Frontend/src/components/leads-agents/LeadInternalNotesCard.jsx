"use client";

import DetailCard from "@/components/common/DetailCard";

/**
 * LeadInternalNotesCard
 *
 * API Integration Guidelines:
 * - Data source: `lead` row mapped from `GET /api/clients/{id}`
 *   - followUpNote: Client.followUpNote (free-text follow-up note)
 *   - notes: Client.notes (internal operational / broker notes)
 *
 * Missing notes render an honest empty state ("No internal notes on file.").
 */
export default function LeadInternalNotesCard({ lead }) {
  const note =
    lead?.followUpNote ||
    lead?.internalNotes ||
    lead?.notes ||
    null;

  return (
    <DetailCard title="Internal Notes">
      <div className="p-3.5 sm:p-4 rounded-lg border border-border bg-white shadow-sm">
        {note ? (
          <p className="font-montserrat text-[12px] sm:text-[13px] text-foreground leading-relaxed">
            {note}
          </p>
        ) : (
          <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground italic">
            No internal notes on file.
          </p>
        )}
      </div>
    </DetailCard>
  );
}
