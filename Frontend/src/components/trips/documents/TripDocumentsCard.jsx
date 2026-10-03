import Link from "next/link";
import { FileText } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import DocumentsPanel from "@/components/documents/DocumentsPanel";

/**
 * What is on file for the trip: the quote it was booked from, the enquiry it
 * answered, and its folder in the Document Vault (#22) — the signed charter
 * agreement, the wire confirmation, the catering request. The folder is the
 * vault's own list, not a copy on the trip.
 */
export default function TripDocumentsCard({ trip }) {
  return (
    <DetailCard title="Documents & Links">
      <div className="flex flex-col gap-3">
        {trip?.quote && (
          <Link href={`/dashboard/quotes/${trip.quote.id}`} className="flex items-center gap-2.5 hover:underline">
            <div className="flex items-center justify-center rounded-sm bg-purple/10 text-purple size-8 shrink-0">
              <FileText className="size-4" />
            </div>
            <p className="font-montserrat font-medium text-[13px] text-foreground">Quote {trip.quote.reference}</p>
          </Link>
        )}
        {trip?.tripRequest && (
          <Link href={`/dashboard/trip-requests?search=${encodeURIComponent(trip.tripRequest.reference)}`} className="flex items-center gap-2.5 hover:underline">
            <div className="flex items-center justify-center rounded-sm bg-info/10 text-info size-8 shrink-0">
              <FileText className="size-4" />
            </div>
            <p className="font-montserrat font-medium text-[13px] text-foreground">Enquiry {trip.tripRequest.reference}</p>
          </Link>
        )}
        {trip?.id ? (
          <DocumentsPanel
            owner={{ type: "TRIP", id: trip.id, label: trip?.reference }}
            readOnly={trip?.isArchived}
            compact
          />
        ) : null}
      </div>
    </DetailCard>
  );
}
