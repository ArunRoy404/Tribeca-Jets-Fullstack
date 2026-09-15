import DetailCard from "@/components/trips/DetailCard";
import RouteDeparturePoint from "@/components/trips/tripRoute/RouteDeparturePoint";
import RouteAircraftDivider from "@/components/trips/tripRoute/RouteAircraftDivider";
import RouteArrivalPoint from "@/components/trips/tripRoute/RouteArrivalPoint";

export default function TripFlightRouteCard({ trip }) {
  const fromCode = trip?.fromCode || "JFK";
  const toCode = trip?.toCode || "LHR";
  const registration = trip?.registration || "N1040TJ";

  return (
    <DetailCard title="Flight Route">
      <div className="flex flex-col gap-1">
        {/* Departure Point */}
        <RouteDeparturePoint
          code={fromCode}
          time={trip?.departureTime}
          airportName={trip?.from?.name}
          city={trip?.from?.city}
        />

        {/* Middle Aircraft Line */}
        <RouteAircraftDivider
          aircraft={trip?.aircraft}
          registration={registration}
        />

        {/* Arrival Point */}
        <RouteArrivalPoint
          code={toCode}
          time={trip?.arrivalTime}
          airportName={trip?.to?.name}
          city={trip?.to?.city}
        />
      </div>
    </DetailCard>
  );
}
