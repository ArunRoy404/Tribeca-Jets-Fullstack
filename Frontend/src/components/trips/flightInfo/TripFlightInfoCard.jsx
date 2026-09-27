import DetailCard from "@/components/trips/DetailCard";
import FlightInfoBox from "@/components/trips/flightInfo/FlightInfoBox";

/**
 * Flight and arrival times. This card used to print "2h 45m" and "18:15 ET"
 * on every trip whatever its route — confident times nobody calculated.
 * Estimated times need the route and aircraft performance, and confirmed ones
 * the operator's itinerary (Itineraries, #12); until then each box says so.
 */
export default function TripFlightInfoCard() {
  return (
    <DetailCard
      title="Flight Information"
      description="Times appear once the operator's itinerary is on file. Nothing here is estimated until then."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-1">
        <FlightInfoBox label="Estimated Flight Time" value="—" description="Not calculated yet" status="PENDING" statusTone="muted" />
        <FlightInfoBox label="Estimated Arrival Time" value="—" description="Not calculated yet" status="PENDING" statusTone="muted" />
        <FlightInfoBox label="Confirmed Flight Time" value="—" description="Awaiting the operator itinerary" status="PENDING" statusTone="muted" />
        <FlightInfoBox label="Confirmed Arrival Time" value="—" description="Awaiting the operator itinerary" status="PENDING" statusTone="muted" />
      </div>
    </DetailCard>
  );
}
