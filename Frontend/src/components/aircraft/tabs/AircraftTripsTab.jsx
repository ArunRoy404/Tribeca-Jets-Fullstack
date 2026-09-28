"use client";

import RelatedTripsList from "@/components/trips/RelatedTripsList";

/** Trips flown on this tail — live since Trips (#11) shipped. */
export default function AircraftTripsTab({ aircraft }) {
  return (
    <div className="bg-white rounded-lg border border-border w-full shadow-card p-4">
      <RelatedTripsList filter={{ aircraftId: aircraft?.id }} emptyText="Trips booked on this aircraft will appear here." />
    </div>
  );
}
