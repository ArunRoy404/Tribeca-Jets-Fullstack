"use client";

import { useMemo } from "react";
import { useReportSummary, useReportsParams } from "@/hooks/reports";
import { toReportTiles } from "@/lib/reports";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import TableStatus from "@/components/table/common/TableStatus";

/** The four tiles for the report's window. */
export default function ReportsStats() {
  const { window } = useReportsParams();
  const query = useReportSummary(window);
  const tiles = useMemo(() => toReportTiles(query.data), [query.data]);

  if (query.isPending || query.error) {
    return <TableStatus isLoading={query.isPending} error={query.error} onRetry={query.refetch} />;
  }
  return <SimpleStatsRow stats={tiles} gridClassName="grid grid-cols-2 lg:grid-cols-4" />;
}
