import DetailCard from "@/components/trips/DetailCard";

/**
 * The trip's standing notes. They used to say the client "prefers morning
 * departures" and "strongly prefers" the operator — about every client.
 * The running commentary is the Activity Timeline; these are the fixed notes.
 */
export default function TripNotesCard({ trip }) {
  return (
    <DetailCard title="Notes">
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-montserrat font-semibold text-[12px] text-foreground">Internal Notes</p>
          <p className="font-montserrat text-[12px] text-muted-foreground whitespace-pre-line">{trip?.internalNotes || "No internal notes."}</p>
        </div>
        <div>
          <p className="font-montserrat font-semibold text-[12px] text-foreground">Client Notes</p>
          <p className="font-montserrat text-[12px] text-muted-foreground whitespace-pre-line">{trip?.clientNotes || "No client notes."}</p>
        </div>
      </div>
    </DetailCard>
  );
}
