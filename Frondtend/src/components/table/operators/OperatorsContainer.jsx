"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit2, Send } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useOperatorsStore } from "@/store/useOperatorsStore";
import TablePagination from "@/components/table/common/TablePagination";
import OperatorsToolbar from "./OperatorsToolbar";
import OperatorsCardsContainer from "./OperatorsCardsContainer";
import OperatorsTable from "./OperatorsTable";
import AddOperatorDialog from "@/components/operators/AddOperatorDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";

export default function OperatorsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  const search = useOperatorsStore((s) => s.search);
  const setSearch = useOperatorsStore((s) => s.setSearch);
  const statusFilter = useOperatorsStore((s) => s.statusFilter);
  const setStatusFilter = useOperatorsStore((s) => s.setStatusFilter);
  const page = useOperatorsStore((s) => s.page);
  const nextPage = useOperatorsStore((s) => s.nextPage);
  const prevPage = useOperatorsStore((s) => s.prevPage);
  const openAddModal = useOperatorsStore((s) => s.openAddModal);
  const openEditModal = useOperatorsStore((s) => s.openEditModal);
  const openQuoteModal = useOperatorsStore((s) => s.openQuoteModal);

  const getPageOperators = useOperatorsStore((s) => s.getPageOperators);
  const getPageCount = useOperatorsStore((s) => s.getPageCount);
  const getFilteredCount = useOperatorsStore((s) => s.getFilteredCount);

  const pageOperators = getPageOperators?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleOpenDetails = (id) => {
    router?.push(`/dashboard/operators/${id}`);
  };

  const getRowActions = (op) => [
    { label: "View Details", icon: <Eye />, onSelect: () => handleOpenDetails(op?.id) },
    { label: "Edit Operator", icon: <Edit2 />, onSelect: () => openEditModal?.(op) },
    { label: "Request Quote", icon: <Send />, onSelect: () => openQuoteModal?.(op) },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <OperatorsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddOperator={openAddModal}
        />

        <div className="relative w-full lg:hidden">
          <OperatorsCardsContainer
            operators={pageOperators}
            selected={selected}
            onToggleRow={toggleRow}
            getRowActions={getRowActions}
            onSelectOperator={handleOpenDetails}
          />
        </div>

        <OperatorsTable
          pageOperators={pageOperators}
          selected={selected}
          onSelectAll={() =>
            setSelected((prev) =>
              prev.size === pageOperators?.length ? new Set() : new Set(pageOperators?.map((op) => op?.id))
            )
          }
          onToggleRow={toggleRow}
          getRowActions={getRowActions}
          onSelectOperator={handleOpenDetails}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="operators"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddOperatorDialog />
        <RequestOperatorQuoteDialog />
      </CommonCard>
    </Reveal>
  );
}
