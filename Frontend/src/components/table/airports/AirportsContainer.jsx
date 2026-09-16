"use client";

import { useMemo, useState } from "react";
import { Eye, Edit2, Trash2, RotateCcw } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import AirportsToolbar from "./AirportsToolbar";
import AirportsCardsContainer from "./AirportsCardsContainer";
import AirportsTable from "./AirportsTable";
import AddAirportDialog from "@/components/airports/AddAirportDialog";
import DeleteAirportDialog from "@/components/airports/DeleteAirportDialog";
import AirportDetailsSidebar from "@/components/airports/AirportDetailsSidebar";
import {
  useAirports,
  useAirportsTableParams,
  useRemoveAirports,
  useRestoreAirport,
  useRestoreAirports,
} from "@/hooks/airports";
import { ARCHIVE_TABS } from "@/lib/archive";
import { useAirportsStore } from "@/store/useAirportsStore";
import { toAirportRow } from "@/lib/airport";

export default function AirportsContainer({ revealDelay = 0 }) {
  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useAirportsTableParams();
  const airportsQuery = useAirports(params?.queryParams);

  const openAddModal = useAirportsStore((s) => s.openAddModal);
  const openEditModal = useAirportsStore((s) => s.openEditModal);
  const openDeleteModal = useAirportsStore((s) => s.openDeleteModal);
  const openDetailsSidebar = useAirportsStore((s) => s.openDetailsSidebar);

  const rows = useMemo(
    () => (airportsQuery?.data?.data ?? []).map(toAirportRow),
    [airportsQuery?.data?.data],
  );
  const meta = airportsQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);

  // Selection is per-page and disposable, so it stays local rather than in the
  // URL — a checkbox is not a view someone would link to.
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeMany, isPending: isRemovingMany } = useRemoveAirports();
  const { mutate: restoreMany, isPending: isRestoringMany } = useRestoreAirports();
  const { mutate: restoreAirport } = useRestoreAirport();

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

  const getRowActions = (apt) =>
    isArchived
      ? [
          { label: "View Details", icon: <Eye />, onSelect: () => openDetailsSidebar?.(apt) },
          {
            label: "Restore Airport",
            icon: <RotateCcw />,
            onSelect: () => restoreAirport?.(apt),
          },
        ]
      : [
          { label: "View Details", icon: <Eye />, onSelect: () => openDetailsSidebar?.(apt) },
          { label: "Edit Airport", icon: <Edit2 />, onSelect: () => openEditModal?.(apt) },
          "separator",
          {
            label: "Remove Airport",
            icon: <Trash2 />,
            variant: "destructive",
            onSelect: () => openDeleteModal?.(apt),
          },
        ];

  const isEmpty = !airportsQuery?.isPending && !airportsQuery?.error && rows.length === 0;

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <AirportsToolbar
          search={params?.search}
          setSearch={params?.setSearch}
          countryFilter={params?.country}
          setCountryFilter={params?.setCountry}
          limit={params?.limit}
          setLimit={params?.setLimit}
          onAddAirport={openAddModal}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          tab={params?.tab}
          setTab={params?.setTab}
        />

        {airportsQuery?.isPending || airportsQuery?.error || isEmpty ? (
          <TableStatus
            isLoading={airportsQuery?.isPending}
            error={airportsQuery?.error}
            isEmpty={isEmpty}
            emptyMessage={
              isArchived ? "Nothing archived" : "No airports match these filters"
            }
            emptyHint={
              isArchived
                ? "Removed airports appear here and can be restored."
                : params?.hasFilters
                  ? "Try clearing the search or country filter."
                  : "Add the first airport to get started."
            }
            onRetry={airportsQuery?.refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <AirportsCardsContainer
                airports={rows}
                selected={selected}
                onToggleRow={toggleRow}
                getRowActions={getRowActions}
                onSelectAirport={openDetailsSidebar}
              />
            </div>

            <AirportsTable
              archived={isArchived}
              pageAirports={rows}
              selected={selected}
              onSelectAll={() =>
                setSelected((prev) =>
                  prev.size === rows.length ? new Set() : new Set(rows.map((apt) => apt?.id)),
                )
              }
              onToggleRow={toggleRow}
              getRowActions={getRowActions}
              onSelectAirport={openDetailsSidebar}
            />
          </>
        )}

        {/* Hidden until the first page lands, so the pager never shows
            "0 airports · Page 1 of 1" during the initial load. */}
        {meta ? (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel={isArchived ? "archived airports" : "airports"}
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
            primary: item?.icao,
            secondary: item?.name,
          }))}
          itemLabel="airports"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? "These airports will return to the main list, exactly as they were."
              : "These airports will be removed from the list. Trips and itineraries that reference them keep working, and you can bring them back from the Archived tab."
          }
          onConfirm={handleBulkAction}
          isPending={isRemovingMany || isRestoringMany}
        />

        <AddAirportDialog />
        <DeleteAirportDialog />
        <AirportDetailsSidebar />
      </CommonCard>
    </Reveal>
  );
}
