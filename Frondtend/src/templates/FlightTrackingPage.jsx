import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import FlightTrackingContainer from "@/components/table/flight-tracking/FlightTrackingContainer";
import FlightTrackingDetailSheet from "@/components/flight-tracking/FlightTrackingDetailSheet";
import { flightTrackingStats } from "@/dummyData/flightTracking";

export default function FlightTrackingPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={flightTrackingStats} />
      <FlightTrackingContainer />
      <FlightTrackingDetailSheet />
    </div>
  );
}
