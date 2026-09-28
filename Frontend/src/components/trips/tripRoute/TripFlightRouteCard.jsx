import DetailCard from "@/components/trips/DetailCard";
import RouteDeparturePoint from "@/components/trips/tripRoute/RouteDeparturePoint";
import RouteAircraftDivider from "@/components/trips/tripRoute/RouteAircraftDivider";
import RouteArrivalPoint from "@/components/trips/tripRoute/RouteArrivalPoint";
import { formatTime24 } from "@/lib/time";

/**
 * Every leg, in order. The fallbacks this card used to carry — "JFK", "LHR"
 * and registration "N1040TJ" on any trip without them — are gone: a missing
 * value is an em dash. The trip itself tracks only a departure time per leg;
 * an arrival time exists only for the outbound leg, and only once the trip's
 * itinerary (#12) records one — every other leg stays a dash.
 */
export default function TripFlightRouteCard({ trip }) {
  const legs = trip?.legs ?? [];
  const outboundArrival = trip?.itinerary?.arrivalTime ? formatTime24(trip.itinerary.arrivalTime) : "—";

  return (
    <DetailCard title={legs.length > 1 ? `Flight Route · ${legs.length} legs` : "Flight Route"}>
      <div className="flex flex-col gap-6">
        {legs.length === 0 && <p className="font-montserrat text-[13px] text-muted-foreground">No legs on this trip.</p>}
        {legs.map((leg, index) => (
          <div key={leg.id} className="flex flex-col gap-1">
            {legs.length > 1 && (
              <p className="font-montserrat font-semibold text-[12px] text-muted-foreground">Leg {leg.sequence}</p>
            )}
            <RouteDeparturePoint code={leg.fromCode} time={leg.departure} airportName={leg.fromName} city={leg.fromCity} />
            <RouteAircraftDivider aircraft={trip?.aircraft} registration={trip?.registration ?? "—"} />
            <RouteArrivalPoint code={leg.toCode} time={index === 0 ? outboundArrival : "—"} airportName={leg.toName} city={leg.toCity} />
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
