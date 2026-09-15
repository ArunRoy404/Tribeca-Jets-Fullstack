"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, RefreshCw, ExternalLink } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useFlightTrackingStore, FLIGHT_TRACKING_PAGE_SIZE } from "@/store/useFlightTrackingStore";
import TablePagination from "@/components/table/common/TablePagination";
import FlightTrackingToolbar from "./FlightTrackingToolbar";
import FlightTrackingCardsContainer from "./FlightTrackingCardsContainer";
import FlightTrackingTable from "./FlightTrackingTable";

export default function FlightTrackingContainer({ revealDelay = 0 }) {
  const router = useRouter();
  const flights = useFlightTrackingStore((s) => s.flights);
  const search = useFlightTrackingStore((s) => s.search);
  const setSearch = useFlightTrackingStore((s) => s.setSearch);
  const statusFilter = useFlightTrackingStore((s) => s.statusFilter);
  const setStatusFilter = useFlightTrackingStore((s) => s.setStatusFilter);
  const page = useFlightTrackingStore((s) => s.page);
  const nextPage = useFlightTrackingStore((s) => s.nextPage);
  const prevPage = useFlightTrackingStore((s) => s.prevPage);
  const selectFlight = useFlightTrackingStore((s) => s.selectFlight);

  const filteredFlights = useMemo(() => {
    const query = (search ?? "").trim().toLowerCase();
    return (flights ?? []).filter((f) => {
      if (statusFilter !== "All" && f?.flightStatus !== statusFilter) return false;
      if (
        query &&
        !`${f?.id} ${f?.client} ${f?.tailNumber} ${f?.aircraft} ${f?.operator} ${f?.origin} ${f?.destination}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [flights, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil((filteredFlights?.length ?? 0) / FLIGHT_TRACKING_PAGE_SIZE));
  const pageFlights = useMemo(() => {
    const start = (page - 1) * FLIGHT_TRACKING_PAGE_SIZE;
    return filteredFlights?.slice(start, start + FLIGHT_TRACKING_PAGE_SIZE);
  }, [filteredFlights, page]);
  const filteredCount = filteredFlights?.length ?? 0;

  const getRowActions = (f) => [
    { label: "View Flight Tracking", icon: <Eye />, onSelect: () => selectFlight?.(f?.id) },
    { label: "Refresh Tracking", icon: <RefreshCw /> },
    "separator",
    {
      label: "View Trip Record",
      icon: <ExternalLink />,
      onSelect: () => router?.push(`/dashboard/trips/${encodeURIComponent(f?.id?.replace("#", "") ?? "")}`),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <FlightTrackingToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        <div className="relative w-full lg:hidden">
          <FlightTrackingCardsContainer
            flights={pageFlights}
            getRowActions={getRowActions}
            onSelectFlight={selectFlight}
          />
        </div>

        <FlightTrackingTable
          pageFlights={pageFlights}
          onSelectFlight={selectFlight}
          getRowActions={getRowActions}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="flights"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>
      </CommonCard>
    </Reveal>
  );
}
