import DetailCard from "@/components/trips/DetailCard";
import FlightInfoBox from "@/components/trips/flightInfo/FlightInfoBox";

export default function TripFlightInfoCard({ trip }) {
  const flightInfo = trip?.flightInformation;

  return (
    <DetailCard
      title="Flight Information"
      description="System-generated estimates are used until the official operator itinerary is uploaded. Confirmed operator data automatically replaces estimates."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-1">
        <FlightInfoBox
          label="Estimated Flight Time"
          value={flightInfo?.estimatedFlightTime || "2h 45m"}
          description="System calculated from route & aircraft"
          status="ESTIMATED"
          statusTone="muted"
        />
        <FlightInfoBox
          label="Estimated Arrival Time"
          value={flightInfo?.estimatedArrival || "18:15 ET"}
          description="Based on selected departure time"
          status="ESTIMATED"
          statusTone="muted"
        />
        <FlightInfoBox
          label="Confirmed Flight Time"
          value={flightInfo?.confirmedFlightTime || "2h 38m"}
          description="Operator itinerary uploaded"
          status="CONFIRMED"
          statusTone="warning"
        />
        <FlightInfoBox
          label="Confirmed Arrival Time"
          value={flightInfo?.confirmedArrival || "18:08 ET"}
          description="Official operator itinerary"
          status="CONFIRMED"
          statusTone="warning"
        />
      </div>
    </DetailCard>
  );
}
