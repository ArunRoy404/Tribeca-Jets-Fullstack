"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Edit, Eye, RotateCcw, Trash2, XCircle } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TripsToolbar from "./TripsToolbar";
import TripsTable from "./TripsTable";
import TripsCardsContainer from "./TripsCardsContainer";
import {
  useChangeTripStatus,
  useRemoveTrip,
  useRestoreTrip,
  useTrips,
  useTripsTableParams,
} from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { moveVerb, toTripRow } from "@/lib/trip";
import { ARCHIVE_TABS } from "@/lib/archive";

/** The trips board (#11), API-backed: the URL is the state, the server pages. */
export default function TripsContainer({ revealDelay = 0 }) {
  const router = useRouter();
  const params = useTripsTableParams();
  const { data, isPending, error, refetch } = useTrips(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toTripRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canAccess } = usePermissions();
  const mayCreate = canAccess(Module.TRIPS, Action.CREATE);
  const mayEdit = canAccess(Module.TRIPS, Action.EDIT);
  const mayArchive = canAccess(Module.TRIPS, Action.ARCHIVE);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: changeStatus } = useChangeTripStatus();
  const { mutate: removeTrips } = useRemoveTrip();
  const { mutate: restoreTrips } = useRestoreTrip();

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
    (isArchived ? restoreTrips : removeTrips)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => router?.push(`/dashboard/trips/${id}`);

  /**
   * One definition of a row's menu for the table and the cards. The status
   * moves offered are exactly the ones the API says this trip may make next
   * (`nextStatuses`), so the menu never offers a move that would be refused.
   */
  const getRowActions = (trip) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => openDetails(trip?.id) };

    if (isArchived) {
      return mayArchive
        ? [view, { label: "Restore Trip", icon: <RotateCcw />, onSelect: () => restoreTrips?.(trip?.id) }]
        : [view];
    }

    const actions = [view];
    if (trip?.editable && mayEdit) {
      actions.push({ label: "Edit Trip", icon: <Edit />, onSelect: () => router?.push(`/dashboard/trips/${trip?.id}/edit`) });
    }
    if (mayEdit) {
      for (const status of trip?.nextStatuses ?? []) {
        const cancel = status === "CANCELLED";
        actions.push({
          label: moveVerb(status, trip?.rawStatus),
          icon: cancel ? <XCircle className="text-destructive" /> : <ArrowRight />,
          variant: cancel ? "destructive" : undefined,
          // label uses the trip's current status so a step back reads "Back to …"
          onSelect: () => changeStatus?.({ id: trip?.id, status }),
        });
      }
    }
    if (mayArchive) {
      actions.push("separator");
      actions.push({
        label: "Archive Trip",
        icon: <Trash2 />,
        variant: "destructive",
        onSelect: () => removeTrips?.(trip?.id),
      });
    }
    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <TripsToolbar
          search={params.search}
          setSearch={params.setSearch}
          status={params.status}
          setStatus={params.setStatus}
          departure={params.departure}
          setDeparture={params.setDeparture}
          assignedBrokerId={params.assignedBrokerId}
          setAssignedBrokerId={params.setAssignedBrokerId}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          selectedCount={selected.size}
          onBulkAction={() => setBulkOpen(true)}
          mayCreate={mayCreate}
          mayArchive={mayArchive}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No trips match these filters"}
            emptyHint={
              isArchived
                ? "Archived trips appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "Book an approved quote, or add a trip by hand, and it will appear here."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <TripsCardsContainer items={rows} getActions={getRowActions} onItemClick={(item) => openDetails(item?.id)} />
            </div>

            <TripsTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectTrip={(item) => openDetails(item?.id)}
              selected={selected}
              onToggleRow={toggleRow}
              onSelectAll={() =>
                setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((row) => row?.id))))
              }
              selectable={mayArchive}
              archived={isArchived}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="trips"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: `${row?.reference} · ${row?.client} · ${row?.route}` }))}
          itemLabel="trips"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
