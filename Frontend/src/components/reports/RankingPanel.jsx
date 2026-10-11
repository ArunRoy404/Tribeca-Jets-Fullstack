"use client";

import DarkPanel from "@/components/common/DarkPanel";
import TableStatus from "@/components/table/common/TableStatus";
import ReportTable from "./ReportTable";

/**
 * A ranking over the report's window — brokers, clients, routes — showing
 * the API's first page, largest revenue first, and saying how many more
 * there are rather than implying the list is complete.
 */
export default function RankingPanel({ title, query, rows, columns, emptyMessage }) {
  const total = query?.data?.meta?.total ?? 0;
  const shown = rows?.length ?? 0;
  const status = query?.isPending || query?.error || !shown;

  return (
    <DarkPanel title={title}>
      {status ? (
        <TableStatus
          isLoading={query?.isPending}
          error={query?.error}
          isEmpty={!shown}
          emptyMessage={emptyMessage}
          emptyHint="Booked and flown trips departing in this period appear here."
          onRetry={query?.refetch}
        />
      ) : (
        <>
          <ReportTable columns={columns} rows={rows} rowKey={(row) => row?.id} />
          {total > shown && (
            <p className="px-2.5 py-2 font-montserrat text-[11px] text-muted-foreground">
              Top {shown} of {total}
            </p>
          )}
        </>
      )}
    </DarkPanel>
  );
}
