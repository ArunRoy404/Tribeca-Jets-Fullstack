"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Send, Copy, XCircle } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useTripsStore } from "@/store/useTripsStore";
import TablePagination from "@/components/table/common/TablePagination";
import ExportOperationsDialog from "./ExportOperationsDialog";
import TripsCardsContainer from "./TripsCardsContainer";
import TripsToolbar from "./TripsToolbar";
import TripsTable from "./TripsTable";

export default function TripsContainer({ revealDelay = 0 }) {
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
  const getPageTrips = useTripsStore((s) => s.getPageTrips);
  const getPageCount = useTripsStore((s) => s.getPageCount);
  const getFilteredCount = useTripsStore((s) => s.getFilteredCount);

  const router = useRouter();
  const [exportOpen, setExportOpen] = useState(false);

  const pageTrips = getPageTrips?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const goToTrip = (t) => router?.push(`/dashboard/trips/${encodeURIComponent(t?.id?.replace("#", "") ?? "")}`);
  const getRowActions = (t) => [
    { label: "View Details", icon: <Eye />, onSelect: () => goToTrip(t) },
    { label: "Send Itinerary", icon: <Send /> },
    { label: "Duplicate Trip", icon: <Copy /> },
    "separator",
    { label: "Cancel Trip", icon: <XCircle />, variant: "destructive" },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <TripsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          brokerFilter={brokerFilter}
          setBrokerFilter={setBrokerFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          onExport={() => setExportOpen(true)}
        />

        <div className="relative w-full lg:hidden">
          <TripsCardsContainer trips={pageTrips} onSelectTrip={goToTrip} getRowActions={getRowActions} />
        </div>

        <TripsTable pageTrips={pageTrips} onSelectTrip={goToTrip} getRowActions={getRowActions} />

        <div className="relative w-full">
          <TablePagination totalCount={filteredCount} itemLabel="trips" page={page} pageCount={pageCount} onPrev={prevPage} onNext={nextPage} />
        </div>

        <ExportOperationsDialog open={exportOpen} onOpenChange={setExportOpen} />
      </CommonCard>
    </Reveal>
  );
}
