"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, RotateCcw, Trash2, User, XCircle } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TripRequestsToolbar from "./TripRequestsToolbar";
import TripRequestsCardsContainer from "./TripRequestsCardsContainer";
import TripRequestsTable from "./TripRequestsTable";
import TripRequestDialog from "@/components/trip-requests/TripRequestDialog";
import ArchiveTripRequestDialog from "@/components/trip-requests/ArchiveTripRequestDialog";
import { useTripRequestsStore } from "@/store/useTripRequestsStore";
import {
  REQUEST_TABS,
  useRemoveManyTripRequests,
  useRestoreManyTripRequests,
  useRestoreTripRequest,
  useTripRequestTableParams,
  useTripRequests,
  useUpdateTripRequest,
} from "@/hooks/trip-requests";
import { toTripRequestRow } from "@/lib/lead";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";

export default function TripRequestsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  // The URL is the state. Every filter and the tab read and write it, so the
  // view survives a reload and the back button steps through it.
  const params = useTripRequestTableParams();
  const requestsQuery = useTripRequests(params?.queryParams);

  const openAddModal = useTripRequestsStore((s) => s.openAddModal);
  const openEditModal = useTripRequestsStore((s) => s.openEditModal);
  const openArchiveModal = useTripRequestsStore((s) => s.openArchiveModal);

  const rows = useMemo(
    () => (requestsQuery?.data?.data ?? []).map(toTripRequestRow),
    [requestsQuery?.data?.data],
  );
  const meta = requestsQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);
  const isEmpty =
    !requestsQuery?.isPending && !requestsQuery?.error && rows.length === 0;

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeMany, isPending: isRemovingMany } = useRemoveManyTripRequests();
  const { mutate: restoreMany, isPending: isRestoringMany } = useRestoreManyTripRequests();
  const { mutate: restoreRequest } = useRestoreTripRequest();
  const { mutate: updateRequest } = useUpdateTripRequest();

  /**
   * An enquiry is a stage of a trip, so it borrows the trips permissions
   * rather than having its own — the same decision the API made.
   *
   * The two are genuinely different reaches: a broker files and works their
   * own requests, but only an administrator archives one. That is why the
   * checkbox column follows `DELETE_TRIPS` and the Add button follows
   * `MANAGE_TRIPS`.
   */
  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);
  const mayRemove = canWrite(Permission.DELETE_TRIPS);

  const isArchived = params?.tab === REQUEST_TABS.ARCHIVED;

  // The selection holds ids; the dialog lists the rows behind them. Derived
  // from the current page, so a row removed underneath us simply drops out
  // rather than being confirmed by name and then not found.
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row?.id)),
    [rows, selected],
  );

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

  /**
   * Opening a row opens its client.
   *
   * There is no trip-request detail page, and inventing one that only repeats
   * the row would be a screen nobody asked for. The client *is* the context —
   * their other enquiries, their follow-ups and their history are all there —
   * so the row links to the record that actually has more to say.
   */
  const handleOpenClient = (clientId) => {
    if (!clientId) return;
    router?.push(`/dashboard/clients/${clientId}`);
  };

  const getRowActions = (request) => {
    const viewClient = {
      label: "View Client",
      icon: <User />,
      onSelect: () => handleOpenClient(request?.clientId),
    };
    // Everything below is a write, so a read-only role gets the one action it
    // can actually perform rather than a menu of 403s.
    if (!mayWrite && !mayRemove) return [viewClient];

    if (isArchived) {
      return mayRemove
        ? [
            viewClient,
            {
              label: "Restore Request",
              icon: <RotateCcw />,
              onSelect: () => restoreRequest?.(request),
            },
          ]
        : [viewClient];
    }

    const actions = [viewClient];
    if (mayWrite) {
      actions.push({
        label: "Edit Request",
        icon: <Edit2 />,
        onSelect: () => openEditModal?.(request),
      });
      /**
       * The action the desk actually reaches for, and the reason this page
       * exists: most enquiries never book. Marking one Lost keeps it in the
       * log — which is what makes it findable when an empty leg matches it
       * later — where archiving would take it out of the working list
       * altogether.
       */
      if (request?.rawStatus !== "LOST") {
        actions.push({
          label: "Mark as Lost",
          icon: <XCircle />,
          onSelect: () => updateRequest?.({ id: request?.id, status: "LOST" }),
        });
      }
    }
    if (mayRemove) {
      actions.push("separator", {
        label: "Remove Request",
        icon: <Trash2 />,
        variant: "destructive",
        onSelect: () => openArchiveModal?.(request),
      });
    }
    return actions;
  };

  const emptyCopy = () => {
    if (isArchived) {
      return {
        message: "Nothing archived",
        hint: "Removed requests appear here and can be restored.",
      };
    }
    if (params?.hasFilters) {
      return {
        message: "No trip requests match these filters",
        hint: "Try clearing a filter, or widening the departure window.",
      };
    }
    if (params?.tab === REQUEST_TABS.ACTIVE) {
      return {
        message: "Nothing active right now",
        hint: "Requests that converted or were lost are on the All Requests tab — nothing is ever removed from the log.",
      };
    }
    return {
      message: "No trip requests yet",
      hint: "File the first enquiry a client gives you.",
    };
  };

  const empty = emptyCopy();

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard
        variant="default"
        className="p-0 rounded-md overflow-hidden border-border w-full"
      >
        <TripRequestsToolbar
          search={params?.search}
          setSearch={params?.setSearch}
          statusFilter={params?.status}
          setStatusFilter={params?.setStatus}
          sourceFilter={params?.source}
          setSourceFilter={params?.setSource}
          aircraftFilter={params?.aircraftPreference}
          setAircraftFilter={params?.setAircraftPreference}
          departureFilter={params?.departure}
          setDepartureFilter={params?.setDeparture}
          limit={params?.limit}
          setLimit={params?.setLimit}
          onAddRequest={openAddModal}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          tab={params?.tab}
          setTab={params?.setTab}
          mayWrite={mayWrite}
          mayRemove={mayRemove}
        />

        {requestsQuery?.isPending || requestsQuery?.error || isEmpty ? (
          <TableStatus
            isLoading={requestsQuery?.isPending}
            error={requestsQuery?.error}
            isEmpty={isEmpty}
            emptyMessage={empty.message}
            emptyHint={empty.hint}
            onRetry={requestsQuery?.refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <TripRequestsCardsContainer
                requests={rows}
                selected={selected}
                onToggleRow={toggleRow}
                getRowActions={getRowActions}
                onSelectRequest={(id) =>
                  handleOpenClient(rows.find((row) => row?.id === id)?.clientId)
                }
                archived={isArchived}
                selectable={mayRemove}
              />
            </div>

            <TripRequestsTable
              archived={isArchived}
              selectable={mayRemove}
              pageRequests={rows}
              selected={selected}
              onSelectAll={() =>
                setSelected((prev) =>
                  prev.size === rows.length
                    ? new Set()
                    : new Set(rows.map((row) => row?.id)),
                )
              }
              onToggleRow={toggleRow}
              getRowActions={getRowActions}
              onSelectRequest={(id) =>
                handleOpenClient(rows.find((row) => row?.id === id)?.clientId)
              }
            />
          </>
        )}

        {/* Hidden until the first page lands, so the pager never shows
            "0 requests · Page 1 of 1" during the initial load. */}
        {meta ? (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel={isArchived ? "archived requests" : "trip requests"}
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
            primary: `${item?.reference} · ${item?.clientName}`,
            secondary: item?.route,
          }))}
          itemLabel="trip request"
          action={isArchived ? "restore" : "remove"}
          note={
            isArchived
              ? "These requests will return to the log, exactly as they were."
              : "These requests move to the Archived tab and can be restored at any time. If an enquiry simply went nowhere, mark it Lost instead — it stays in the log, which is what makes it findable when an empty leg matches it later."
          }
          onConfirm={handleBulkAction}
          isPending={isRemovingMany || isRestoringMany}
        />

        <TripRequestDialog />
        <ArchiveTripRequestDialog />
      </CommonCard>
    </Reveal>
  );
}
