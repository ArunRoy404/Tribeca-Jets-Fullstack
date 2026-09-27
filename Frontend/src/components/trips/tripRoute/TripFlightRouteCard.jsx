import DetailCard from "@/components/trips/DetailCard";
import RouteDeparturePoint from "@/components/trips/tripRoute/RouteDeparturePoint";
import RouteAircraftDivider from "@/components/trips/tripRoute/RouteAircraftDivider";
import RouteArrivalPoint from "@/components/trips/tripRoute/RouteArrivalPoint";

/**
 * Every leg, in order. The fallbacks this card used to carry — "JFK", "LHR"
 * and registration "N1040TJ" on any trip without them — are gone: a missing
 * value is an em dash. Arrival times are not known until the operator's
 * itinerary arrives (Itineraries, #12), so they read as a dash too.
 */
export default function TripFlightRouteCard({ trip }) {
  const legs = trip?.legs ?? [];

  return (
    <DetailCard title={legs.length > 1 ? `Flight Route · ${legs.length} legs` : "Flight Route"}>
      <div className="flex flex-col gap-6">
        {legs.length === 0 && <p className="font-montserrat text-[13px] text-muted-foreground">No legs on this trip.</p>}
        {legs.map((leg) => (
          <div key={leg.id} className="flex flex-col gap-1">
            {legs.length > 1 && (
              <p className="font-montserrat font-semibold text-[12px] text-muted-foreground">Leg {leg.sequence}</p>
            )}
            <RouteDeparturePoint code={leg.fromCode} time={leg.departure} airportName={leg.fromName} city={leg.fromCity} />
            <RouteAircraftDivider aircraft={trip?.aircraft} registration={trip?.registration ?? "—"} />
            <RouteArrivalPoint code={leg.toCode} time="—" airportName={leg.toName} city={leg.toCity} />
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
