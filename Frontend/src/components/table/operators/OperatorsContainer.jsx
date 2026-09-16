"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit2, Send, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useOperatorsStore } from "@/store/useOperatorsStore";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import OperatorsToolbar from "./OperatorsToolbar";
import OperatorsCardsContainer from "./OperatorsCardsContainer";
import OperatorsTable from "./OperatorsTable";
import AddOperatorDialog from "@/components/operators/AddOperatorDialog";
import DeleteOperatorDialog from "@/components/operators/DeleteOperatorDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";
import {
  useOperators,
  useOperatorsTableParams,
  useRemoveOperators,
  useRestoreOperator,
  useRestoreOperators,
} from "@/hooks/operators";
import { ARCHIVE_TABS } from "@/lib/archive";
import { toOperatorRow } from "@/lib/operator";

export default function OperatorsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useOperatorsTableParams();
  const operatorsQuery = useOperators(params?.queryParams);

  const openAddModal = useOperatorsStore((s) => s.openAddModal);
  const openEditModal = useOperatorsStore((s) => s.openEditModal);
  const openQuoteModal = useOperatorsStore((s) => s.openQuoteModal);
  const openDeleteModal = useOperatorsStore((s) => s.openDeleteModal);

  const rows = useMemo(
    () => (operatorsQuery?.data?.data ?? []).map(toOperatorRow),
    [operatorsQuery?.data?.data],
  );
  const meta = operatorsQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);
  const isEmpty =
    !operatorsQuery?.isPending && !operatorsQuery?.error && rows.length === 0;

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeMany, isPending: isRemovingMany } = useRemoveOperators();
  const { mutate: restoreMany, isPending: isRestoringMany } = useRestoreOperators();
  const { mutate: restoreOperator } = useRestoreOperator();

  const isArchived = params?.tab === ARCHIVE_TABS.ARCHIVED;

  // The selection holds ids; the dialog lists the rows behind them. Derived
  // from the current page, so a row removed underneath us simply drops out
  // rather than being confirmed by name and then not found.
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row?.id)),
    [rows, selected],
  );

  // The checkbox column is on both tabs, so the bulk action follows the tab:
  // Remove on the live list, Restore on Archived. Removing an already-removed
  // row is the one thing the Archived tab must not offer.
  const handleBulkAction = () => {
    const ids = selectedRows.map((row) => row?.id).filter(Boolean);
    if (!ids.length) return;
    const run = isArchived ? restoreMany : removeMany;
    run(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        // Clearing matters: those rows have left this tab, and leaving them
        // selected would keep the button offering to act on rows it no longer
        // shows.
        setSelected(new Set());
      },
    });
  };

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleOpenDetails = (id) => {
    router?.push(`/dashboard/operators/${id}`);
  };

  const getRowActions = (op) =>
    isArchived
      ? [
          { label: "View Details", icon: <Eye />, onSelect: () => handleOpenDetails(op?.id) },
          {
            label: "Restore Operator",
            icon: <RotateCcw />,
            onSelect: () => restoreOperator?.(op),
          },
        ]
      : [
          { label: "View Details", icon: <Eye />, onSelect: () => handleOpenDetails(op?.id) },
          { label: "Edit Operator", icon: <Edit2 />, onSelect: () => openEditModal?.(op) },
          // Sourcing a quote from an archived operator is not a thing anyone
          // means to do, so it is absent rather than disabled.
          { label: "Request Quote", icon: <Send />, onSelect: () => openQuoteModal?.(op) },
          "separator",
          {
            label: "Remove Operator",
            icon: <Trash2 />,
            variant: "destructive",
            onSelect: () => openDeleteModal?.(op),
          },
        ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <OperatorsToolbar
          search={params?.search}
          setSearch={params?.setSearch}
          statusFilter={params?.status}
          setStatusFilter={params?.setStatus}
          limit={params?.limit}
          setLimit={params?.setLimit}
          onAddOperator={openAddModal}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          tab={params?.tab}
          setTab={params?.setTab}
        />

        {operatorsQuery?.isPending || operatorsQuery?.error || isEmpty ? (
          <TableStatus
            isLoading={operatorsQuery?.isPending}
            error={operatorsQuery?.error}
            isEmpty={isEmpty}
            emptyMessage={
              isArchived ? "Nothing archived" : "No operators match these filters"
            }
            emptyHint={
              isArchived
                ? "Removed operators appear here and can be restored."
                : params?.hasFilters
                  ? "Try clearing the search or status filter."
                  : "Add the first operator to get started."
            }
            onRetry={operatorsQuery?.refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <OperatorsCardsContainer
                operators={rows}
                selected={selected}
                onToggleRow={toggleRow}
                getRowActions={getRowActions}
                onSelectOperator={handleOpenDetails}
              />
            </div>

            <OperatorsTable
              archived={isArchived}
              pageOperators={rows}
              selected={selected}
              onSelectAll={() =>
                setSelected((prev) =>
                  prev.size === rows.length ? new Set() : new Set(rows.map((op) => op?.id)),
                )
              }
              onToggleRow={toggleRow}
              getRowActions={getRowActions}
              onSelectOperator={handleOpenDetails}
            />
          </>
        )}

        {/* Hidden until the first page lands, so the pager never shows
            "0 operators · Page 1 of 1" during the initial load. */}
        {meta ? (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel={isArchived ? "archived operators" : "operators"}
              page={meta?.page ?? 1}
              pageCount={pageCount}
              onPrev={() => params?.goToPage?.((meta?.page ?? 1) - 1, pageCount)}
              onNext={() => params?.goToPage?.((meta?.page ?? 1) + 1, pageCount)}
              onPageChange={(next) => params?.goToPage?.(next, pageCount)}
            />
          </div>
        ) : null}

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((item) => ({
            id: item?.id,
            primary: item?.name,
            secondary: item?.homeBase,
          }))}
          itemLabel="operators"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? "These operators will return to the main list, exactly as they were."
              : "These operators will be removed from the list. Trips, quotes and payments that reference them keep working."
          }
          onConfirm={handleBulkAction}
          isPending={isRemovingMany || isRestoringMany}
        />

        <AddOperatorDialog />
        <DeleteOperatorDialog />
        <RequestOperatorQuoteDialog />
      </CommonCard>
    </Reveal>
  );
}
