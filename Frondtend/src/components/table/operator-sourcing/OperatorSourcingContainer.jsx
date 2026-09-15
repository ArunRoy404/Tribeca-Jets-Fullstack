"use client";

import { useState } from "react";
import { Eye, FileText, MessageSquare, XCircle } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import TablePagination from "@/components/table/common/TablePagination";
import OperatorSourcingToolbar from "./OperatorSourcingToolbar";
import OperatorSourcingCardsContainer from "./OperatorSourcingCardsContainer";
import OperatorSourcingTable from "./OperatorSourcingTable";

export default function OperatorSourcingContainer({ revealDelay = 0 }) {
  const search = useOperatorSourcingStore((s) => s.search);
  const setSearch = useOperatorSourcingStore((s) => s.setSearch);
  const statusFilter = useOperatorSourcingStore((s) => s.statusFilter);
  const setStatusFilter = useOperatorSourcingStore((s) => s.setStatusFilter);
  const brokerFilter = useOperatorSourcingStore((s) => s.brokerFilter);
  const setBrokerFilter = useOperatorSourcingStore((s) => s.setBrokerFilter);
  const paymentFilter = useOperatorSourcingStore((s) => s.paymentFilter);
  const setPaymentFilter = useOperatorSourcingStore((s) => s.setPaymentFilter);
  const page = useOperatorSourcingStore((s) => s.page);
  const nextPage = useOperatorSourcingStore((s) => s.nextPage);
  const prevPage = useOperatorSourcingStore((s) => s.prevPage);
  const selectRequest = useOperatorSourcingStore((s) => s.selectRequest);
  const openNewRequest = useOperatorSourcingStore((s) => s.openNewRequest);

  const getPageRequests = useOperatorSourcingStore((s) => s.getPageRequests);
  const getPageCount = useOperatorSourcingStore((s) => s.getPageCount);
  const getFilteredCount = useOperatorSourcingStore((s) => s.getFilteredCount);

  const pageRequests = getPageRequests?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const getRowActions = (r) => [
    { label: "View Request", icon: <Eye />, onSelect: () => selectRequest?.(r?.id) },
    { label: "View Quotes", icon: <FileText />, onSelect: () => selectRequest?.(r?.id) },
    { label: "Message Operators", icon: <MessageSquare /> },
    "separator",
    { label: "Cancel Request", icon: <XCircle />, variant: "destructive" },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <OperatorSourcingToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          brokerFilter={brokerFilter}
          setBrokerFilter={setBrokerFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          onNewRequest={openNewRequest}
        />

        <div className="relative w-full lg:hidden">
          <OperatorSourcingCardsContainer
            requests={pageRequests}
            selected={selected}
            onToggleRow={toggleRow}
            getRowActions={getRowActions}
            onSelectRequest={selectRequest}
          />
        </div>

        <OperatorSourcingTable
          pageRequests={pageRequests}
          selected={selected}
          onSelectAll={() =>
            setSelected((prev) =>
              prev.size === pageRequests?.length ? new Set() : new Set(pageRequests?.map((r) => r?.id))
            )
          }
          onToggleRow={toggleRow}
          getRowActions={getRowActions}
          onSelectRequest={selectRequest}
        />

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
      </CommonCard>
    </Reveal>
  );
}
