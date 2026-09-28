import TripRequestStats from "@/components/trip-requests/TripRequestStats";
import TripRequestsContainer from "@/components/table/trip-requests/TripRequestsContainer";

export default function TripRequestsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <TripRequestStats />
      <TripRequestsContainer />
    </div>
  );
}
