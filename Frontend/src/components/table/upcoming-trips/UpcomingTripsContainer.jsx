"use client";

import CommonCard from "@/components/common/CommonCard";
import SectionHeader from "@/components/common/SectionHeader";
import Reveal from "@/components/common/Reveal";
import TableStatus from "@/components/table/common/TableStatus";
import UpcomingTripsTable from "./UpcomingTripsTable";
import UpcomingTripsCardsContainer from "./UpcomingTripsCardsContainer";
import { useTrips } from "@/hooks/trips";
import { queryPresets } from "@/config/query.config";
import { toTripRow } from "@/lib/trip";

/**
 * The next active trips, soonest departure first — the trips list with
 * `departure=ONWARD&activeOnly=true`. Payment columns and profit are the
 * API's, and a dash for a role that may not read them.
 */
export default function UpcomingTripsContainer({ revealDelay = 0 }) {
  const { data, isPending, error, refetch } = useTrips(
    { departure: "ONWARD", activeOnly: true, sortBy: "departureDate", sortOrder: "asc", limit: 5 },
    queryPresets.live,
  );
  const trips = (data?.data ?? []).map((trip) => {
    const row = toTripRow(trip);
    return {
      id: row?.id,
      trip: row?.reference,
      date: row?.departure,
      client: row?.client,
      broker: row?.broker,
      route: row?.route,
      aircraft: row?.aircraft,
      operator: row?.operator,
      status: row?.status,
      clientPmt: row?.clientPayment,
      opPmt: row?.operatorPayment,
      profit: row?.profit,
    };
  });
  const isEmpty = !isPending && !error && trips.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader
          title="Upcoming Trips"
          rightText="View all trips →"
          rightHref="/dashboard/trips"
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="No upcoming trips"
            emptyHint="Booked trips departing today or later appear here."
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <UpcomingTripsCardsContainer trips={trips} />
            </div>
            <UpcomingTripsTable trips={trips} />
          </>
        )}
      </CommonCard>
    </Reveal>
  );
}
