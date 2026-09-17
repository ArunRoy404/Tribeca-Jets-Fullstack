"use client";

import { Eye, FileText, Send, RotateCcw } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { useSourcingTableParams, useTripRequests } from "@/hooks/trip-requests";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toSourcingRow } from "@/lib/sourcing";
import { ARCHIVE_TABS } from "@/lib/archive";
import OperatorSourcingToolbar from "./OperatorSourcingToolbar";
import OperatorSourcingCardsContainer from "./OperatorSourcingCardsContainer";
import OperatorSourcingTable from "./OperatorSourcingTable";

/**
 * The sourcing board.
 *
 * It lists **trip requests**, not a table of its own — the rows are enquiries
 * being worked, and each one's quotes hang underneath it in the detail sheet.
 * That is why this reads `useTripRequests` rather than a sourcing endpoint.
 */
export default function OperatorSourcingContainer({ revealDelay = 0 }) {
  const params = useSourcingTableParams();
  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);

  const selectRequest = useOperatorSourcingStore((s) => s.selectRequest);
  const openNewRequest = useOperatorSourcingStore((s) => s.openNewRequest);
  const openQuoteRequest = useOperatorSourcingStore((s) => s.openQuoteRequest);

  const { data, isPending, error, refetch } = useTripRequests(
    params.queryParams,
  );

  const rows = (data?.data ?? []).map(toSourcingRow);
  const meta = data?.meta;
  const archived = params.tab === ARCHIVE_TABS.ARCHIVED;

  /**
   * One definition of what a row can do, so the table and the mobile cards
   * offer the same menu rather than drifting apart.
   *
   * An archived enquiry offers nothing but a look: its only action is Restore,
   * which lives on the detail sheet beside the reason it was archived.
   */
  const getRowActions = (row) => {
    if (archived) {
      return [
        { label: "View Request", icon: <Eye />, onSelect: () => selectRequest?.(row?.id) },
        ...(mayWrite
          ? [{ label: "Restore", icon: <RotateCcw />, onSelect: () => selectRequest?.(row?.id) }]
          : []),
      ];
    }
    return [
      { label: "View Request", icon: <Eye />, onSelect: () => selectRequest?.(row?.id) },
      { label: "View Quotes", icon: <FileText />, onSelect: () => selectRequest?.(row?.id) },
      ...(mayWrite
        ? [{ label: "Ask an Operator", icon: <Send />, onSelect: () => openQuoteRequest?.(row?.id) }]
        : []),
    ];
  };

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard
        variant="default"
        className="p-0 rounded-md overflow-hidden border-border w-full"
      >
        <OperatorSourcingToolbar
          search={params.search}
          setSearch={params.setSearch}
          status={params.status}
          setStatus={params.setStatus}
          aircraftPreference={params.aircraftPreference}
          setAircraftPreference={params.setAircraftPreference}
          assignedBrokerId={params.assignedBrokerId}
          setAssignedBrokerId={params.setAssignedBrokerId}
          limit={params.limit}
          setLimit={params.setLimit}
          tab={params.tab}
          setTab={params.setTab}
          onNewRequest={openNewRequest}
          mayWrite={mayWrite}
        />

        {isPending || error || rows.length === 0 ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={!isPending && !error && rows.length === 0}
            emptyMessage={
              archived ? "Nothing archived" : "No requests match these filters"
            }
            emptyHint={
              archived
                ? "Removed requests appear here and can be restored."
                : params.hasFilters
                  ? "Try clearing a filter, or widening the status."
                  : "Enquiries filed by the desk arrive here, ready to send out to operators."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden">
              <OperatorSourcingCardsContainer
                requests={rows}
                getRowActions={getRowActions}
                onSelectRequest={selectRequest}
              />
            </div>

            <OperatorSourcingTable
              pageRequests={rows}
              getRowActions={getRowActions}
              onSelectRequest={selectRequest}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="requests"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) =>
                  params.goToPage(next, meta?.totalPages ?? 1)
                }
                onPrev={() =>
                  params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)
                }
                onNext={() =>
                  params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)
                }
              />
            </div>
          </>
        )}
      </CommonCard>
    </Reveal>
  );
}
