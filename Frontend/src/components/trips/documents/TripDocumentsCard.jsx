import Link from "next/link";
import { FileText } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import { uploadUrl } from "@/services/uploads.service";

/**
 * What is actually on file: the quote the trip was booked from, the enquiry
 * it answered, and the documents uploaded to it. The old list of "Quote /
 * Itinerary / Invoice / Receipt — Available" was derived from the status.
 */
export default function TripDocumentsCard({ trip }) {
  const docs = trip?.documentUrls ?? [];
  const nothing = !trip?.quote && !trip?.tripRequest && docs.length === 0;

  return (
    <DetailCard title="Documents & Links">
      <div className="flex flex-col gap-3">
        {nothing && <p className="font-montserrat text-[12px] text-muted-foreground">Nothing on file yet.</p>}
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
        {docs.map((url, index) => (
          <a key={url} href={uploadUrl(url)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:underline">
            <div className="flex items-center justify-center rounded-sm bg-destructive/10 text-destructive size-8 shrink-0">
              <FileText className="size-4" />
            </div>
            <p className="font-montserrat font-medium text-[13px] text-foreground">Document {index + 1}</p>
          </a>
        ))}
      </div>
    </DetailCard>
  );
}
