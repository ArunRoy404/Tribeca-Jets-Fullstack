"use client";

import TripDetailsView from "@/components/trips/TripDetailsView";
import NotFoundState from "@/components/common/NotFoundState";
import { useTrip } from "@/hooks/trips";
import { toTripDetail } from "@/lib/trip";

/** One trip, from the API. A trip outside the caller's scope is a 404, like any other. */
export default function TripDetailPage({ tripId }) {
  const { data, isPending, error } = useTrip(tripId);

  if (error) {
    return <NotFoundState itemType="Trip" backUrl="/dashboard/trips" backLabel="Back to Trips" />;
  }
  if (isPending || !data) {
    return <p className="p-6 font-montserrat text-[13px] text-muted-foreground">Loading trip…</p>;
  }
  return <TripDetailsView trip={toTripDetail(data)} />;
}
