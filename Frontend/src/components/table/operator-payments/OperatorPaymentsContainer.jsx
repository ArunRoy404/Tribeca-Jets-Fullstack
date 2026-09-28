"use client";

import { useMemo, useState } from "react";
import { DollarSign, Edit, Eye, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import AddOperatorPaymentDialog from "@/components/operator-payments/AddOperatorPaymentDialog";
import RecordOperatorPaymentDialog from "@/components/operator-payments/RecordOperatorPaymentDialog";
import OperatorPaymentsToolbar from "./OperatorPaymentsToolbar";
import OperatorPaymentsCardsContainer from "./OperatorPaymentsCardsContainer";
import OperatorPaymentsTable from "./OperatorPaymentsTable";
import {
  useOperatorPayables,
  useOperatorPaymentsTableParams,
  useRemoveOperatorPayable,
  useRestoreOperatorPayable,
} from "@/hooks/operator-payments";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toPayableRow } from "@/lib/operatorPayment";
import { ARCHIVE_TABS } from "@/lib/archive";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";

/**
 * The Operator Payments board, API-backed: the URL is the state, the server
 * pages, and every figure on a row is computed by the API from the bill and
 * its payments.
 *
 * Writing is administrators' and senior brokers' only — money leaving the
 * company — so for everyone else the checkbox column, the Add button and every
 * write action are absent rather than disabled. The old screen's "Send
 * Remittance" is not back: Email Templates (#21) can email an operator, but
 * it has no merge fields for an operator bill yet, so a remittance would
 * carry no amount — see MODULE_FEATURE_STATUS §17.
 */
export default function OperatorPaymentsContainer({ revealDelay = 0 }) {
  const params = useOperatorPaymentsTableParams();
  const { data, isPending, error, refetch } = useOperatorPayables(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toPayableRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_OPERATOR_PAYMENTS);

  const openAddModal = useOperatorPaymentsStore((s) => s.openAddModal);
  const openEditModal = useOperatorPaymentsStore((s) => s.openEditModal);
  const openPaymentModal = useOperatorPaymentsStore((s) => s.openPaymentModal);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: removeBills } = useRemoveOperatorPayable();
  const { mutate: restoreBills } = useRestoreOperatorPayable();

  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row?.id)), [rows, selected]);

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleBulkAction = () => {
    const ids = selectedRows.map((row) => row?.id).filter(Boolean);
    if (!ids.length) return;
    (isArchived ? restoreBills : removeBills)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => params.setBill(id);

  const getRowActions = (row) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => openDetails(row?.id) };
    if (!mayWrite) return [view];
    if (isArchived) return [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreBills?.(row?.id) }];

    const actions = [view];
    if (row?.rawStatus === "OPEN" && row?.hasBalance) {
      actions.push({ label: "Record Payment", icon: <DollarSign />, onSelect: () => openPaymentModal?.(row?.raw) });
    }
    actions.push({ label: "Edit", icon: <Edit />, onSelect: () => openEditModal?.(row?.raw) });
    // A bill with money against it cannot be archived; the menu does not
    // offer what the API would refuse.
    if (row?.paymentCount === 0) {
      actions.push("separator");
      actions.push({ label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => removeBills?.(row?.id) });
    }
    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <OperatorPaymentsToolbar
          search={params.search}
          setSearch={params.setSearch}
          state={params.state}
          setState={params.setState}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          onAdd={() => openAddModal()}
          mayWrite={mayWrite}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No operator bills match these filters"}
            emptyHint={
              isArchived
                ? "Archived bills appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "An operator's bill is recorded on a trip — here, or from the trip's own page."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <OperatorPaymentsCardsContainer
                items={rows}
                archived={isArchived}
                getRowActions={getRowActions}
                onSelectBill={openDetails}
              />
            </div>

            <OperatorPaymentsTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectBill={openDetails}
              selected={selected}
              onToggleRow={toggleRow}
              onSelectAll={() =>
                setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((row) => row?.id))))
              }
              selectable={mayWrite}
              archived={isArchived}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="bills"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <AddOperatorPaymentDialog />
        <RecordOperatorPaymentDialog />
        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, primary: `${row?.number} · ${row?.operator}`, secondary: row?.total }))}
          itemLabel="bills"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? undefined
              : "These bills will be archived. Any that carry recorded payments are skipped — withdraw the payments first."
          }
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
