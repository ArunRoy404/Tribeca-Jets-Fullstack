"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Banknote, Edit, Eye, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import AddCommissionDialog from "@/components/commissions/AddCommissionDialog";
import CommissionsToolbar from "./CommissionsToolbar";
import CommissionsCardsContainer from "./CommissionsCardsContainer";
import CommissionsTable from "./CommissionsTable";
import {
  useCommissions,
  useCommissionsTableParams,
  useRemoveCommission,
  useRestoreCommission,
  useUpdateCommission,
} from "@/hooks/commissions";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toCommissionRow } from "@/lib/commission";
import { ARCHIVE_TABS } from "@/lib/archive";
import { useCommissionsStore } from "@/store/useCommissionsStore";

/** The Commissions board, API-backed: the URL is the state, the server pages. */
export default function CommissionsContainer({ revealDelay = 0 }) {
  const params = useCommissionsTableParams();
  const { data, isPending, error, refetch } = useCommissions(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toCommissionRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_COMMISSIONS);

  const openAddModal = useCommissionsStore((s) => s.openAddModal);
  const openEditModal = useCommissionsStore((s) => s.openEditModal);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: updateCommission } = useUpdateCommission();
  const { mutate: removeCommissions } = useRemoveCommission();
  const { mutate: restoreCommissions } = useRestoreCommission();

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
    (isArchived ? restoreCommissions : removeCommissions)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => params.setCommission(id);

  const getRowActions = (row) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => openDetails(row?.id) };
    if (!mayWrite) return [view];
    if (isArchived) {
      return [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreCommissions?.(row?.id) }];
    }
    const actions = [view, { label: "Edit", icon: <Edit />, onSelect: () => openEditModal?.(row?.raw) }];
    if (row?.rawStatus === "PENDING") {
      actions.push({ label: "Mark Earned", icon: <BadgeCheck />, onSelect: () => updateCommission?.({ id: row?.id, status: "EARNED" }) });
    }
    if (row?.rawStatus !== "PAID" && row?.rawStatus !== "CANCELLED") {
      actions.push({ label: "Mark Paid Today", icon: <Banknote />, onSelect: () => updateCommission?.({ id: row?.id, status: "PAID" }) });
    }
    actions.push("separator");
    actions.push({ label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => removeCommissions?.(row?.id) });
    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <CommissionsToolbar
          search={params.search}
          setSearch={params.setSearch}
          status={params.status}
          setStatus={params.setStatus}
          recipientType={params.recipientType}
          setRecipientType={params.setRecipientType}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          onAddCommission={() => openAddModal()}
          mayWrite={mayWrite}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No commissions match these filters"}
            emptyHint={
              isArchived
                ? "Archived commissions appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "Commissions are raised on a trip — by hand here, or automatically when a referral books one."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <CommissionsCardsContainer items={rows} getRowActions={getRowActions} onSelectCommission={openDetails} />
            </div>

            <CommissionsTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectCommission={openDetails}
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
                itemLabel="commissions"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <AddCommissionDialog />
        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: `${row?.reference} · ${row?.recipient} · ${row?.tripReference}` }))}
          itemLabel="commissions"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
