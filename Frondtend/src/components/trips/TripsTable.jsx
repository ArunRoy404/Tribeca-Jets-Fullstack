"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Eye, Send, Copy, XCircle } from "lucide-react";
import { useTripsStore, TRIPS_PAGE_SIZE } from "@/store/useTripsStore";
import { tripStatusOptions, tripBrokerOptions, tripPaymentOptions } from "@/dummyData/trips";
import StatusBadge from "@/components/common/StatusBadge";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import TablePagination from "@/components/table/common/TablePagination";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import ExportOperationsDialog from "@/components/trips/ExportOperationsDialog";
import TripsCardsContainer from "@/components/trips/TripsCardsContainer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Trip ID",
  "Client",
  "Broker",
  "Route",
  "Departure",
  "Return",
  "Aircraft · Operator",
  "Status",
  "Client Pmt",
  "Op Pmt",
  "FET (7.5%)",
  "Profit",
  "Next Action",
  "",
];

export default function TripsTable() {
  const trips = useTripsStore((s) => s.trips);
  const search = useTripsStore((s) => s.search);
  const setSearch = useTripsStore((s) => s.setSearch);
  const statusFilter = useTripsStore((s) => s.statusFilter);
  const setStatusFilter = useTripsStore((s) => s.setStatusFilter);
  const brokerFilter = useTripsStore((s) => s.brokerFilter);
  const setBrokerFilter = useTripsStore((s) => s.setBrokerFilter);
  const paymentFilter = useTripsStore((s) => s.paymentFilter);
  const setPaymentFilter = useTripsStore((s) => s.setPaymentFilter);
  const page = useTripsStore((s) => s.page);
  const nextPage = useTripsStore((s) => s.nextPage);
  const prevPage = useTripsStore((s) => s.prevPage);
  const router = useRouter();
  const [exportOpen, setExportOpen] = useState(false);

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trips.filter((trip) => {
      if (statusFilter !== "All" && trip.status !== statusFilter) return false;
      if (brokerFilter !== "All" && trip.broker !== brokerFilter) return false;
      if (paymentFilter !== "All" && trip.clientPmt !== paymentFilter) return false;
      if (
        query &&
        !`${trip.id} ${trip.client} ${trip.broker} ${trip.aircraft} ${trip.operator}`.toLowerCase().includes(query)
      )
        return false;
      return true;
    });
  }, [trips, search, statusFilter, brokerFilter, paymentFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredTrips.length / TRIPS_PAGE_SIZE));
  const pageTrips = useMemo(() => {
    const start = (page - 1) * TRIPS_PAGE_SIZE;
    return filteredTrips.slice(start, start + TRIPS_PAGE_SIZE);
  }, [filteredTrips, page]);
  const filteredCount = filteredTrips.length;

  const goToTrip = (t) => router.push(`/dashboard/trips/${encodeURIComponent(t.id.replace("#", ""))}`);
  const getRowActions = (t) => [
    { label: "View Details", icon: <Eye />, onSelect: () => goToTrip(t) },
    { label: "Send Itinerary", icon: <Send /> },
    { label: "Duplicate Trip", icon: <Copy /> },
    "separator",
    { label: "Cancel Trip", icon: <XCircle />, variant: "destructive" },
  ];

  return (
    <div className="relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full">
      <Image
        src="/dashboard/bg/trips-table.png"
        alt=""
        fill
        className="object-cover opacity-50 pointer-events-none"
        sizes="1600px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-[#e5eeff]/90 backdrop-blur-2xl pointer-events-none" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-secondary flex gap-2 items-center px-2 py-1 rounded-sm w-56 max-w-full">
            <Image src="/dashboard/icons/search.svg" alt="" width={16} height={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 min-w-0 bg-transparent font-space-grotesk text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <FilterDropdown label="All Status" value={statusFilter} options={tripStatusOptions} onChange={setStatusFilter} />
          <FilterDropdown label="All Brokers" value={brokerFilter} options={tripBrokerOptions} onChange={setBrokerFilter} />
          <FilterDropdown label="All Payments" value={paymentFilter} options={tripPaymentOptions} onChange={setPaymentFilter} />
        </div>
        <div className="flex gap-3 items-center">
          <Button variant="outline" className="px-4 gap-2" onClick={() => setExportOpen(true)}>
            <Download className="size-3.5" />
            Export
          </Button>
          <Button className="px-4 gap-2" render={<Link href="/dashboard/trips/new" />}>
            <Plus className="size-3.5" />
            New Trip
          </Button>
        </div>
      </div>

      <div className="relative w-full lg:hidden">
        <TripsCardsContainer trips={pageTrips} onSelectTrip={goToTrip} getRowActions={getRowActions} />
      </div>

      <div className="relative w-full overflow-x-auto hidden lg:block">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow className="bg-black/10 border-border hover:bg-black/10">
              {columns.map((col) => (
                <TableHead key={col} className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap h-auto">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageTrips.map((t) => (
              <TableRow
                key={t.id}
                className="border-border cursor-pointer"
                onClick={() => goToTrip(t)}
              >
                <TableCell className="p-[10px] font-montserrat font-semibold text-[10px] text-purple">{t.id}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{t.client}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center">{t.broker}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">
                  {t.from} → {t.to}
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">{t.departure}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">{t.return}</TableCell>
                <TableCell className="p-[10px]">
                  <div className="flex flex-col gap-1 font-montserrat font-medium text-[10px] text-foreground whitespace-nowrap">
                    <p>{t.aircraft}</p>
                    <p className="text-purple">{t.operator}</p>
                  </div>
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={t.status} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={t.clientPmt} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={t.opPmt} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-foreground text-center whitespace-nowrap">{t.fet}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[10px] text-success text-center whitespace-nowrap">{t.profit}</TableCell>
                <TableCell className="p-[10px] font-montserrat font-medium text-[10px] text-purple text-center whitespace-nowrap">{t.nextAction}</TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <RowActionsMenu items={getRowActions(t)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageTrips.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                  No trips match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="relative w-full">
        <TablePagination totalCount={filteredCount} itemLabel="trips" page={page} pageCount={pageCount} onPrev={prevPage} onNext={nextPage} />
      </div>

      <ExportOperationsDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
