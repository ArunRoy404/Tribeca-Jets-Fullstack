"use client";

import DetailCard from "@/components/common/DetailCard";

/**
 * The lead's internal notes — `Client.notes`, the broker's own running notes
 * on this person.
 *
 * It used to fall back through `followUpNote` first, which is a different
 * field with a different meaning: the note attached to one scheduled call.
 * `Client.notes` was not returned by the API at all at the time, so the card
 * titled "Internal Notes" always displayed the follow-up note instead.
 */
export default function LeadInternalNotesCard({ lead }) {
  const note = lead?.notes?.trim() || null;

  return (
    <DetailCard title="Internal Notes">
      <div className="p-3.5 sm:p-4 rounded-lg border border-border bg-white shadow-sm">
        {note ? (
          <p className="font-montserrat text-[12px] sm:text-[13px] text-foreground leading-relaxed whitespace-pre-line">
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
