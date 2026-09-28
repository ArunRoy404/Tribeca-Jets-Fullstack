"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import FlightTrackingContainer from "@/components/table/flight-tracking/FlightTrackingContainer";
import FlightTrackingDetailSheet from "@/components/flight-tracking/FlightTrackingDetailSheet";
import { useFlightStats, useFlightsTableParams } from "@/hooks/flight-tracking";
import { toFlightStats } from "@/lib/flight";
import { toISODate } from "@/lib/date";

/**
 * Flight Tracking (#14) — manual. Every status, estimate and link on this
 * page is what the desk reported; there is no flight-data provider, and the
 * page never calls anything "live".
 */
export default function FlightTrackingPage() {
  const params = useFlightsTableParams();
  const { data: stats } = useFlightStats({ on: toISODate(new Date()) });

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={toFlightStats(stats)} />
      <FlightTrackingContainer params={params} />
      <FlightTrackingDetailSheet flightId={params.flight} onClose={() => params.setFlight("")} />
    </div>
  );
}
