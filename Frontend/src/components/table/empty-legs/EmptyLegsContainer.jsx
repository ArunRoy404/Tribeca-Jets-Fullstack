"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Clock, Edit, Eye, RotateCcw, Trash2, UserCheck } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import AddEmptyLegDialog from "@/components/empty-legs/AddEmptyLegDialog";
import EmptyLegsToolbar from "./EmptyLegsToolbar";
import EmptyLegsCardsContainer from "./EmptyLegsCardsContainer";
import EmptyLegsTable from "./EmptyLegsTable";
import {
  useEmptyLegs,
  useEmptyLegsTableParams,
  useRemoveEmptyLeg,
  useRestoreEmptyLeg,
  useUpdateEmptyLeg,
} from "@/hooks/empty-legs";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toEmptyLegRow } from "@/lib/emptyLeg";
import { ARCHIVE_TABS } from "@/lib/archive";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";

/**
 * The Empty Legs board, API-backed (#10b): the URL is the state, the server
 * pages, and each row's match count is the API's.
 */
export default function EmptyLegsContainer({ revealDelay = 0 }) {
  const params = useEmptyLegsTableParams();
  const { data, isPending, error, refetch } = useEmptyLegs(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toEmptyLegRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.OPERATOR_SOURCING);

  const openAddModal = useEmptyLegsStore((s) => s.openAddModal);
  const openEditModal = useEmptyLegsStore((s) => s.openEditModal);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: updateLeg } = useUpdateEmptyLeg();
  const { mutate: removeLegs } = useRemoveEmptyLeg();
  const { mutate: restoreLegs } = useRestoreEmptyLeg();

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
    (isArchived ? restoreLegs : removeLegs)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => params.setLeg(id);

  /** One definition of a row's menu, for the table and the cards alike. */
  const getRowActions = (leg) => {
    const view = { label: "View Matches", icon: <Eye />, onSelect: () => openDetails(leg?.id) };
    if (!mayWrite) return [view];
    if (isArchived) {
      return [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreLegs?.(leg?.id) }];
    }

    const move = (status) => () => updateLeg?.({ id: leg?.id, status });
    const actions = [view, { label: "Edit", icon: <Edit />, onSelect: () => openEditModal?.(leg?.raw) }];
    if (leg?.rawStatus !== "MATCHED") actions.push({ label: "Mark Matched", icon: <UserCheck />, onSelect: move("MATCHED") });
    if (leg?.rawStatus !== "BOOKED") actions.push({ label: "Mark Booked", icon: <CalendarCheck />, onSelect: move("BOOKED") });
    if (leg?.rawStatus !== "EXPIRED") actions.push({ label: "Mark Expired", icon: <Clock />, onSelect: move("EXPIRED") });
    actions.push("separator");
    actions.push({ label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => removeLegs?.(leg?.id) });
    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <EmptyLegsToolbar
          search={params.search}
          setSearch={params.setSearch}
          status={params.status}
          setStatus={params.setStatus}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          onAddEmptyLeg={openAddModal}
          mayWrite={mayWrite}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No empty legs match these filters"}
            emptyHint={
              isArchived
                ? "Archived empty legs appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "Add an operator's empty leg and the trip requests on its route appear as matches."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <EmptyLegsCardsContainer items={rows} getRowActions={getRowActions} onSelectLeg={openDetails} />
            </div>

            <EmptyLegsTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectLeg={openDetails}
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
                itemLabel="empty legs"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <AddEmptyLegDialog />
        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: `${row?.reference} · ${row?.origin} → ${row?.destination}` }))}
          itemLabel="empty legs"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
