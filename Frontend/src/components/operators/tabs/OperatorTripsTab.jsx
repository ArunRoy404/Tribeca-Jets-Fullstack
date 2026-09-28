"use client";

import RelatedTripsList from "@/components/trips/RelatedTripsList";

/**
 * Trips this operator flies — live since Trips (#11) shipped. The table this
 * replaced read `operator.tripHistory`, an array that was always empty, and
 * kept three hardcoded trips in a comment "for reference".
 */
export default function OperatorTripsTab({ operator }) {
  return (
    <div className="bg-white rounded-lg border border-border w-full shadow-card p-4">
      <RelatedTripsList filter={{ operatorId: operator?.id }} emptyText="Trips booked with this operator will appear here." />
    </div>
  );
}
