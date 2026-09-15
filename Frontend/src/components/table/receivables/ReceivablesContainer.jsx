"use client";

import { Eye, Edit, Trash2, DollarSign, Mail } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import TablePagination from "@/components/table/common/TablePagination";
import ReceivablesToolbar from "./ReceivablesToolbar";
import ReceivablesCardsContainer from "./ReceivablesCardsContainer";
import ReceivablesTable from "./ReceivablesTable";
import AddReceivableDialog from "@/components/receivables/AddReceivableDialog";
import RecordPaymentDialog from "@/components/receivables/RecordPaymentDialog";
import DeleteReceivableDialog from "@/components/receivables/DeleteReceivableDialog";

export default function ReceivablesContainer({ revealDelay = 0 }) {
  const search = useReceivablesStore((s) => s.search);
  const setSearch = useReceivablesStore((s) => s.setSearch);
  const statusFilter = useReceivablesStore((s) => s.statusFilter);
  const setStatusFilter = useReceivablesStore((s) => s.setStatusFilter);
  const page = useReceivablesStore((s) => s.page);
  const nextPage = useReceivablesStore((s) => s.nextPage);
  const prevPage = useReceivablesStore((s) => s.prevPage);
  const selectReceivable = useReceivablesStore((s) => s.selectReceivable);
  const openAddModal = useReceivablesStore((s) => s.openAddModal);
  const openEditModal = useReceivablesStore((s) => s.openEditModal);
  const openDeleteModal = useReceivablesStore((s) => s.openDeleteModal);
  const openRecordPaymentModal = useReceivablesStore((s) => s.openRecordPaymentModal);

  const getPageReceivables = useReceivablesStore((s) => s.getPageReceivables);
  const getPageCount = useReceivablesStore((s) => s.getPageCount);
  const getFilteredCount = useReceivablesStore((s) => s.getFilteredCount);

  const pageItems = getPageReceivables?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectReceivable?.(item?.id),
    },
    {
      label: "Record Payment",
      icon: <DollarSign />,
      onSelect: () => openRecordPaymentModal?.(item?.id),
    },
    {
      label: "Send Reminder",
      icon: <Mail />,
      onSelect: () => {
        console.log("Send Reminder for", item?.id);
      },
    },
    {
      label: "Edit",
      icon: <Edit />,
      onSelect: () => openEditModal?.(item),
    },
    "separator",
    {
      label: "Archive",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => openDeleteModal?.(item?.id),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ReceivablesToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddReceivable={openAddModal}
        />

        <div className="relative w-full lg:hidden p-3">
          <ReceivablesCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectReceivable={selectReceivable}
          />
        </div>

        <ReceivablesTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectReceivable={selectReceivable}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="receivables"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddReceivableDialog />
        <RecordPaymentDialog />
        <DeleteReceivableDialog />
      </CommonCard>
    </Reveal>
  );
}
