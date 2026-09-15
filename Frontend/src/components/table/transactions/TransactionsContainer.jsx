"use client";

import { Eye, DollarSign, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import TablePagination from "@/components/table/common/TablePagination";
import TransactionsToolbar from "./TransactionsToolbar";
import TransactionsCardsContainer from "./TransactionsCardsContainer";
import TransactionsTable from "./TransactionsTable";
import RecordTransactionPaymentDialog from "@/components/transactions/RecordTransactionPaymentDialog";
import DeleteTransactionDialog from "@/components/transactions/DeleteTransactionDialog";

export default function TransactionsContainer({ revealDelay = 0 }) {
  const search = useTransactionsStore((s) => s.search);
  const setSearch = useTransactionsStore((s) => s.setSearch);
  const statusFilter = useTransactionsStore((s) => s.statusFilter);
  const setStatusFilter = useTransactionsStore((s) => s.setStatusFilter);
  const page = useTransactionsStore((s) => s.page);
  const nextPage = useTransactionsStore((s) => s.nextPage);
  const prevPage = useTransactionsStore((s) => s.prevPage);
  const selectTransaction = useTransactionsStore((s) => s.selectTransaction);
  const openDeleteModal = useTransactionsStore((s) => s.openDeleteModal);
  const openRecordPaymentModal = useTransactionsStore((s) => s.openRecordPaymentModal);

  const getPageTransactions = useTransactionsStore((s) => s.getPageTransactions);
  const getPageCount = useTransactionsStore((s) => s.getPageCount);
  const getFilteredCount = useTransactionsStore((s) => s.getFilteredCount);

  const pageItems = getPageTransactions?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectTransaction?.(item?.id),
    },
    {
      label: "Record Payment",
      icon: <DollarSign />,
      onSelect: () => openRecordPaymentModal?.(item?.id),
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
        <TransactionsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        <div className="relative w-full lg:hidden p-3">
          <TransactionsCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectTransaction={selectTransaction}
          />
        </div>

        <TransactionsTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectTransaction={selectTransaction}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="transactions"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <RecordTransactionPaymentDialog />
        <DeleteTransactionDialog />
      </CommonCard>
    </Reveal>
  );
}
