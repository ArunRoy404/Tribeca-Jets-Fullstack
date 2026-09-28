"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, ExternalLink } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import FlightTrackingToolbar from "./FlightTrackingToolbar";
import FlightTrackingCardsContainer from "./FlightTrackingCardsContainer";
import FlightTrackingTable from "./FlightTrackingTable";
import { useFlights } from "@/hooks/flight-tracking";
import { toFlightRow } from "@/lib/flight";
import { toISODate } from "@/lib/date";

/**
 * The flight board, API-backed: one row per trip leg, nearest first, with the
 * state the desk last reported. The server pages; the URL is the state.
 */
export default function FlightTrackingContainer({ params, revealDelay = 0 }) {
  const router = useRouter();
  // The browser's own day decides what "today" and "upcoming" mean.
  const request = { ...params?.queryParams, on: toISODate(new Date()) };
  const { data, isPending, error, refetch } = useFlights(request);

  const rows = useMemo(() => (data?.data ?? []).map(toFlightRow), [data?.data]);
  const meta = data?.meta;
  const isEmpty = !isPending && !error && rows.length === 0;
  const open = (id) => params?.setFlight?.(id);

  const getRowActions = (row) => [
    { label: "View Flight Updates", icon: <Eye />, onSelect: () => open(row?.id) },
    "separator",
    {
      label: "View Trip Record",
      icon: <ExternalLink />,
      onSelect: () => row?.tripId && router.push(`/dashboard/trips/${row.tripId}`),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <FlightTrackingToolbar params={params} />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="No flights under these filters"
            emptyHint={params?.hasFilters ? "Try clearing a filter." : "Every leg of a booked trip appears here."}
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <FlightTrackingCardsContainer flights={rows} getRowActions={getRowActions} onSelectFlight={open} />
            </div>

            <FlightTrackingTable pageFlights={rows} onSelectFlight={open} getRowActions={getRowActions} />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="flights"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params?.goToPage?.(next, meta?.totalPages ?? 1)}
                onPrev={() => params?.goToPage?.((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params?.goToPage?.((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}
      </CommonCard>
    </Reveal>
  );
}
