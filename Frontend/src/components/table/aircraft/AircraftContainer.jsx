"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit2, SlidersHorizontal, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useAircraftStore } from "@/store/useAircraftStore";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import AircraftToolbar from "./AircraftToolbar";
import AircraftCardsContainer from "./AircraftCardsContainer";
import AircraftTable from "./AircraftTable";
import AddAircraftDialog from "@/components/aircraft/AddAircraftDialog";
import ArchiveAircraftDialog from "@/components/aircraft/ArchiveAircraftDialog";
import ChangeStatusDialog from "@/components/aircraft/ChangeStatusDialog";
import {
  useAircraftList,
  useAircraftTableParams,
  useRemoveManyAircraft,
  useRestoreAircraft,
  useRestoreManyAircraft,
} from "@/hooks/aircraft";
import { ARCHIVE_TABS } from "@/lib/archive";
import { toAircraftRow } from "@/lib/aircraft";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";

export default function AircraftContainer({ revealDelay = 0 }) {
  const router = useRouter();

  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useAircraftTableParams();
  const aircraftQuery = useAircraftList(params?.queryParams);

  const openAddModal = useAircraftStore((s) => s.openAddModal);
  const openEditModal = useAircraftStore((s) => s.openEditModal);
  const openArchiveModal = useAircraftStore((s) => s.openArchiveModal);
  const openStatusModal = useAircraftStore((s) => s.openStatusModal);

  const rows = useMemo(
    () => (aircraftQuery?.data?.data ?? []).map(toAircraftRow),
    [aircraftQuery?.data?.data],
  );
  const meta = aircraftQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);
  const isEmpty =
    !aircraftQuery?.isPending && !aircraftQuery?.error && rows.length === 0;

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeMany, isPending: isRemovingMany } = useRemoveManyAircraft();
  const { mutate: restoreMany, isPending: isRestoringMany } = useRestoreManyAircraft();
  const { mutate: restoreAircraft } = useRestoreAircraft();

  // Assistants hold MANAGE_AIRCRAFT at READ scope. The API refuses their
  // writes either way; this stops the UI offering them in the first place.
  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_AIRCRAFT);

  const isArchived = params?.tab === ARCHIVE_TABS.ARCHIVED;

  // The selection holds ids; the dialog lists the rows behind them. Derived
  // from the current page, so a row removed underneath us simply drops out
  // rather than being confirmed by name and then not found.
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row?.id)),
    [rows, selected],
  );

  // The checkbox column is on both tabs, so the bulk action follows the tab:
  // Remove on the live list, Restore on Archived.
  const handleBulkAction = () => {
    const ids = selectedRows.map((row) => row?.id).filter(Boolean);
    if (!ids.length) return;
    const run = isArchived ? restoreMany : removeMany;
    run(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        // Those rows have left this tab; leaving them selected would keep the
        // button offering to act on rows it no longer shows.
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
    router?.push(`/dashboard/aircraft/${id}`);
  };

  const getRowActions = (ac) => {
    const view = {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => handleOpenDetails(ac?.id),
    };
    // Everything below View Details is a write, so a read-only role gets the
    // one action it can actually perform rather than a menu of 403s.
    if (!mayWrite) return [view];

    return isArchived
      ? [
          view,
          {
            label: "Restore Aircraft",
            icon: <RotateCcw />,
            onSelect: () => restoreAircraft?.(ac),
          },
        ]
      : [
          view,
          { label: "Edit Aircraft", icon: <Edit2 />, onSelect: () => openEditModal?.(ac) },
          // One entry covering all four statuses. It used to be a two-way
          // Maintenance/Available toggle, which left Inactive and In Service
          // reachable only through the Edit form — and read "Set Maintenance"
          // on a tail that had already left the fleet.
          //
          // Changing an archived tail's status is not a thing anyone means to
          // do, so it is absent on that tab rather than disabled.
          {
            label: "Change Status",
            icon: <SlidersHorizontal />,
            onSelect: () => openStatusModal?.(ac),
          },
          "separator",
          {
            label: "Remove Aircraft",
            icon: <Trash2 />,
            variant: "destructive",
            onSelect: () => openArchiveModal?.(ac),
          },
        ];
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <AircraftToolbar
          search={params?.search}
          setSearch={params?.setSearch}
          statusFilter={params?.status}
          setStatusFilter={params?.setStatus}
          categoryFilter={params?.category}
          setCategoryFilter={params?.setCategory}
          minPassengers={params?.minPassengers}
          setMinPassengers={params?.setMinPassengers}
          minRangeNm={params?.minRangeNm}
          setMinRangeNm={params?.setMinRangeNm}
          amenities={params?.amenities}
          setAmenities={params?.setAmenities}
          limit={params?.limit}
          setLimit={params?.setLimit}
          onAddAircraft={openAddModal}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          tab={params?.tab}
          setTab={params?.setTab}
          mayWrite={mayWrite}
        />

        {aircraftQuery?.isPending || aircraftQuery?.error || isEmpty ? (
          <TableStatus
            isLoading={aircraftQuery?.isPending}
            error={aircraftQuery?.error}
            isEmpty={isEmpty}
            emptyMessage={
              isArchived ? "Nothing archived" : "No aircraft match these filters"
            }
            emptyHint={
              isArchived
                ? "Removed aircraft appear here and can be restored."
                : params?.hasFilters
                  ? "Try widening the seat or range minimum, or clearing a filter."
                  : "Add the first aircraft to get started."
            }
            onRetry={aircraftQuery?.refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <AircraftCardsContainer
                aircraft={rows}
                selected={selected}
                onToggleRow={toggleRow}
                getRowActions={getRowActions}
                onSelectAircraft={handleOpenDetails}
                archived={isArchived}
                selectable={mayWrite}
              />
            </div>

            <AircraftTable
              archived={isArchived}
              selectable={mayWrite}
              pageAircraft={rows}
              selected={selected}
              onSelectAll={() =>
                setSelected((prev) =>
                  prev.size === rows.length ? new Set() : new Set(rows.map((ac) => ac?.id)),
                )
              }
              onToggleRow={toggleRow}
              getRowActions={getRowActions}
              onSelectAircraft={handleOpenDetails}
            />
          </>
        )}

        {/* Hidden until the first page lands, so the pager never shows
            "0 aircraft · Page 1 of 1" during the initial load. */}
        {meta ? (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel={isArchived ? "archived aircraft" : "aircraft"}
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
            primary: `${item?.model} (${item?.tailNumber})`,
            secondary: item?.operator,
          }))}
          itemLabel="aircraft"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? "These aircraft will return to the main list, exactly as they were."
              : "These aircraft will be removed from the list. Quotes and trips that reference them keep working. To take a tail out of service without removing it, set its status to Inactive instead."
          }
          onConfirm={handleBulkAction}
          isPending={isRemovingMany || isRestoringMany}
        />

        <AddAircraftDialog />
        <ArchiveAircraftDialog />
        <ChangeStatusDialog />
      </CommonCard>
    </Reveal>
  );
}
