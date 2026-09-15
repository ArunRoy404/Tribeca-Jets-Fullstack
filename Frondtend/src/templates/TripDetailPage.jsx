import TripDetailsView from "@/components/trips/TripDetailsView";
import NotFoundState from "@/components/common/NotFoundState";
import { getTripDetails } from "@/dummyData/tripDetails";

export default function TripDetailPage({ tripId }) {
  const trip = getTripDetails(tripId);

  if (!trip) {
    return <NotFoundState itemType="Trip" backUrl="/dashboard/trips" backLabel="Back to Trips" />;
  }

  return <TripDetailsView trip={trip} />;
}
