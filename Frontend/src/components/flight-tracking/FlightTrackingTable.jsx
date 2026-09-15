"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Eye, Plane, RefreshCw, ExternalLink } from "lucide-react";
import { useFlightTrackingStore, FLIGHT_TRACKING_PAGE_SIZE } from "@/store/useFlightTrackingStore";
import { flightStatusFilterOptions } from "@/dummyData/flightTracking";
import StatusBadge from "@/components/common/StatusBadge";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import TablePagination from "@/components/table/common/TablePagination";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import FlightTrackingCardsContainer from "./FlightTrackingCardsContainer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";

const columns = [
  "Trip ID",
  "Client",
  "Tail #",
  "Aircraft",
  "Operator",
  "Route",
  "Departure",
  "Flight Status",
  "Trip Status",
  "",
];

export default function FlightTrackingTable() {
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
    const query = search.trim().toLowerCase();
    return flights.filter((f) => {
      if (statusFilter !== "All" && f.flightStatus !== statusFilter) return false;
      if (
        query &&
        !`${f.id} ${f.client} ${f.tailNumber} ${f.aircraft} ${f.operator} ${f.origin} ${f.destination}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [flights, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredFlights.length / FLIGHT_TRACKING_PAGE_SIZE));
  const pageFlights = useMemo(() => {
    const start = (page - 1) * FLIGHT_TRACKING_PAGE_SIZE;
    return filteredFlights.slice(start, start + FLIGHT_TRACKING_PAGE_SIZE);
  }, [filteredFlights, page]);
  const filteredCount = filteredFlights.length;

  const getRowActions = (f) => [
    { label: "View Flight Tracking", icon: <Eye />, onSelect: () => selectFlight(f.id) },
    { label: "Refresh Tracking", icon: <RefreshCw /> },
    "separator",
    {
      label: "View Trip Record",
      icon: <ExternalLink />,
      onSelect: () => router.push(`/dashboard/trips/${encodeURIComponent(f.id.replace("#", ""))}`),
    },
  ];

  return (
    <div className="relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full bg-white shadow-card">
      <Image
        src="/dashboard/bg/trips-table.png"
        alt=""
        fill
        className="object-cover opacity-30 pointer-events-none"
        sizes="1600px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 to-[#f3f4f8]/95 backdrop-blur-2xl pointer-events-none" />

      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-secondary flex gap-2 items-center px-3 py-1.5 rounded-sm w-72 max-w-full">
            <Image src="/dashboard/icons/search.svg" alt="" width={16} height={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Trip #, tail #, client, route..."
              className="flex-1 min-w-0 bg-transparent font-space-grotesk text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <FilterDropdown
            label="Flight Status"
            value={statusFilter}
            options={flightStatusFilterOptions}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Mobile Cards Container */}
      <div className="relative w-full lg:hidden p-3">
        <FlightTrackingCardsContainer getRowActions={getRowActions} />
      </div>

      {/* Desktop Table Container */}
      <div className="relative w-full overflow-x-auto hidden lg:block">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-black/5 border-border hover:bg-black/5">
              {columns.map((col, idx) => (
                <TableHead
                  key={col || idx}
                  className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap h-auto"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageFlights.map((f) => (
              <TableRow
                key={f.id}
                className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
                onClick={() => selectFlight(f.id)}
              >
                <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-purple text-center">
                  {f.tripId}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground text-center">
                  {f.client}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center">
                  {f.tailNumber}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center">
                  {f.aircraft}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-purple text-center">
                  {f.operator}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap">
                  {f.origin} <span className="text-muted-foreground font-normal">→</span> {f.destination}
                </TableCell>
                <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
                  {f.departureDate}
                </TableCell>
                <TableCell className="p-[12px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={f.flightStatus} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[12px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={f.tripStatus} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <RowActionsMenu items={getRowActions(f)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageFlights.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                  No flight records match the specified filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="relative w-full">
        <TablePagination
          totalCount={filteredCount}
          itemLabel="requests"
          page={page}
          pageCount={pageCount}
          onPrev={prevPage}
          onNext={nextPage}
        />
      </div>
    </div>
  );
}
