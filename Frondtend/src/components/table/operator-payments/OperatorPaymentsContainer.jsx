"use client";

import { Eye, Edit, Trash2, DollarSign, Mail } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";
import TablePagination from "@/components/table/common/TablePagination";
import OperatorPaymentsToolbar from "./OperatorPaymentsToolbar";
import OperatorPaymentsCardsContainer from "./OperatorPaymentsCardsContainer";
import OperatorPaymentsTable from "./OperatorPaymentsTable";
import AddOperatorPaymentDialog from "@/components/operator-payments/AddOperatorPaymentDialog";
import RecordOperatorPaymentDialog from "@/components/operator-payments/RecordOperatorPaymentDialog";
import DeleteOperatorPaymentDialog from "@/components/operator-payments/DeleteOperatorPaymentDialog";

export default function OperatorPaymentsContainer({ revealDelay = 0 }) {
  const search = useOperatorPaymentsStore((s) => s.search);
  const setSearch = useOperatorPaymentsStore((s) => s.setSearch);
  const statusFilter = useOperatorPaymentsStore((s) => s.statusFilter);
  const setStatusFilter = useOperatorPaymentsStore((s) => s.setStatusFilter);
  const page = useOperatorPaymentsStore((s) => s.page);
  const nextPage = useOperatorPaymentsStore((s) => s.nextPage);
  const prevPage = useOperatorPaymentsStore((s) => s.prevPage);
  const selectPayment = useOperatorPaymentsStore((s) => s.selectPayment);
  const openAddModal = useOperatorPaymentsStore((s) => s.openAddModal);
  const openEditModal = useOperatorPaymentsStore((s) => s.openEditModal);
  const openDeleteModal = useOperatorPaymentsStore((s) => s.openDeleteModal);
  const openRecordPaymentModal = useOperatorPaymentsStore((s) => s.openRecordPaymentModal);

  const getPageOperatorPayments = useOperatorPaymentsStore((s) => s.getPageOperatorPayments);
  const getPageCount = useOperatorPaymentsStore((s) => s.getPageCount);
  const getFilteredCount = useOperatorPaymentsStore((s) => s.getFilteredCount);

  const pageItems = getPageOperatorPayments?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectPayment?.(item?.id),
    },
    {
      label: "Record Payment",
      icon: <DollarSign />,
      onSelect: () => openRecordPaymentModal?.(item?.id),
    },
    {
      label: "Send Remittance",
      icon: <Mail />,
      onSelect: () => {
        console.log("Send Remittance for", item?.id);
      },
    },
    {
      label: "Edit",
      icon: <Edit />,
      onSelect: () => openEditModal?.(item),
    },
    "separator",
    {
      label: "Delete",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => openDeleteModal?.(item?.id),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <OperatorPaymentsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddPayment={openAddModal}
        />

        <div className="relative w-full lg:hidden p-3">
          <OperatorPaymentsCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectPayment={selectPayment}
          />
        </div>

        <OperatorPaymentsTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectPayment={selectPayment}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="payments"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddOperatorPaymentDialog />
        <RecordOperatorPaymentDialog />
        <DeleteOperatorPaymentDialog />
      </CommonCard>
    </Reveal>
  );
}
