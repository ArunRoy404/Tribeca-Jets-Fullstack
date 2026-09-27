"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Edit, Eye, RotateCcw, Send, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import ItinerariesToolbar from "./ItinerariesToolbar";
import ItinerariesCardsContainer from "./ItinerariesCardsContainer";
import ItinerariesTable from "./ItinerariesTable";
import BuildItineraryDialog from "@/components/itineraries/BuildItineraryDialog";
import SendItineraryDialog from "@/components/itineraries/SendItineraryDialog";
import ItineraryDetailSheet from "@/components/itineraries/ItineraryDetailSheet";
import {
  useConfirmItinerary,
  useItineraries,
  useItinerariesTableParams,
  useRemoveItinerary,
  useRestoreItinerary,
} from "@/hooks/itineraries";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toItineraryRow } from "@/lib/itinerary";
import { ARCHIVE_TABS } from "@/lib/archive";
import { useItinerariesStore } from "@/store/useItinerariesStore";

/** The Itineraries board (#12), API-backed: the URL is the state, the server pages. */
export default function ItinerariesContainer({ revealDelay = 0 }) {
  const params = useItinerariesTableParams();
  const { data, isPending, error, refetch } = useItineraries(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toItineraryRow), [data?.data]);
  const meta = data?.meta;
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const isEmpty = !isPending && !error && rows.length === 0;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);

  const openBuildModal = useItinerariesStore((s) => s.openBuildModal);
  const openEditModal = useItinerariesStore((s) => s.openEditModal);
  const openSendModal = useItinerariesStore((s) => s.openSendModal);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const { mutate: confirmItinerary } = useConfirmItinerary();
  const { mutate: removeItineraries } = useRemoveItinerary();
  const { mutate: restoreItineraries } = useRestoreItinerary();

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
    (isArchived ? restoreItineraries : removeItineraries)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  const openDetails = (id) => params.setItinerary(id);

  /** One definition of a row's menu, for the table and the cards alike. */
  const getRowActions = (item) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => openDetails(item?.id) };

    if (isArchived) {
      return mayWrite
        ? [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreItineraries?.(item?.id) }]
        : [view];
    }
    if (!mayWrite) return [view];

    const actions = [
      view,
      { label: "Send to Client", icon: <Send />, onSelect: () => openSendModal?.(item?.id) },
    ];
    if (!item?.confirmed) {
      actions.push({ label: "Confirm Itinerary", icon: <CheckCircle />, onSelect: () => confirmItinerary?.(item?.id) });
    }
    actions.push({ label: "Edit", icon: <Edit />, onSelect: () => openEditModal?.(item?.raw) });
    actions.push("separator");
    actions.push({
      label: "Archive",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => removeItineraries?.(item?.id),
    });
    return actions;
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ItinerariesToolbar
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
          onBuildItinerary={openBuildModal}
          mayWrite={mayWrite}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={isArchived ? "Nothing archived" : "No itineraries match these filters"}
            emptyHint={
              isArchived
                ? "Archived itineraries appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter."
                  : "Build a passenger itinerary from a saved trip and it will appear here."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <ItinerariesCardsContainer
                items={rows}
                getRowActions={getRowActions}
                onSelectItinerary={openDetails}
                selected={selected}
                onToggleRow={toggleRow}
                selectable={mayWrite}
                archived={isArchived}
              />
            </div>

            <ItinerariesTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectItinerary={openDetails}
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
                itemLabel="itineraries"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}

        <BuildItineraryDialog />
        <SendItineraryDialog />
        <ItineraryDetailSheet itineraryId={params.itinerary} onClose={() => params.setItinerary("")} />

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: `${row?.tripReference} · ${row?.client}` }))}
          itemLabel="itineraries"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
