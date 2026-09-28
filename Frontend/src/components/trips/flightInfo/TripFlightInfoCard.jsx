import DetailCard from "@/components/trips/DetailCard";
import FlightInfoBox from "@/components/trips/flightInfo/FlightInfoBox";
import { formatTime24 } from "@/lib/time";

/**
 * Flight and arrival times. This card used to print "2h 45m" and "18:15 ET"
 * on every trip whatever its route — confident times nobody calculated.
 * Estimated times still need the route and aircraft performance, which
 * nothing in this system calculates, so those two boxes stay pending.
 * Confirmed times come from the trip's own itinerary (#12) once one exists.
 */
export default function TripFlightInfoCard({ trip }) {
  const itinerary = trip?.itinerary;
  const hasTimes = Boolean(itinerary?.flightTime || itinerary?.arrivalTime);

  return (
    <DetailCard
      title="Flight Information"
      description={
        hasTimes
          ? "Confirmed times, from the trip's itinerary."
          : "Times appear once the operator's itinerary is on file. Nothing here is estimated until then."
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-1">
        <FlightInfoBox label="Estimated Flight Time" value="—" description="Not calculated yet" status="PENDING" statusTone="muted" />
        <FlightInfoBox label="Estimated Arrival Time" value="—" description="Not calculated yet" status="PENDING" statusTone="muted" />
        <FlightInfoBox
          label="Confirmed Flight Time"
          value={itinerary?.flightTime || "—"}
          description={itinerary ? "From the itinerary" : "Awaiting the operator itinerary"}
          status={itinerary?.flightTime ? "ON FILE" : "PENDING"}
          statusTone={itinerary?.flightTime ? undefined : "muted"}
        />
        <FlightInfoBox
          label="Confirmed Arrival Time"
          value={itinerary?.arrivalTime ? formatTime24(itinerary.arrivalTime) : "—"}
          description={itinerary ? "From the itinerary" : "Awaiting the operator itinerary"}
          status={itinerary?.arrivalTime ? "ON FILE" : "PENDING"}
          statusTone={itinerary?.arrivalTime ? undefined : "muted"}
        />
      </div>
    </DetailCard>
  );
}
