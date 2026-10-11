"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useReportSummary, useReportsParams } from "@/hooks/reports";
import { summaryCaveats, toFinancialSummary } from "@/lib/reports";
import DarkPanel from "@/components/common/DarkPanel";
import TableStatus from "@/components/table/common/TableStatus";

const TONE_CLASSES = {
  success: "text-success",
  info: "text-info",
  purple: "text-purple",
  destructive: "text-destructive",
  warning: "text-warning",
  foreground: "text-foreground",
};

/**
 * Revenue and profit by departure date, FET and cash by payment date, and
 * AR/AP as they stand today — each said under the panel, so nobody reads a
 * "this week" FET figure as the tax on this week's flights.
 */
export default function FinancialSummaryPanel() {
  const { window } = useReportsParams();
  const query = useReportSummary(window);
  const rows = useMemo(() => toFinancialSummary(query.data), [query.data]);
  const caveats = useMemo(() => summaryCaveats(query.data), [query.data]);

  return (
    <DarkPanel title="Financial Summary" bodyClassName="p-3 sm:p-4">
      {query.isPending || query.error ? (
        <TableStatus isLoading={query.isPending} error={query.error} onRetry={query.refetch} />
      ) : (
        <div className="flex flex-col gap-2 w-full">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 border border-border rounded-sm px-2 py-1"
            >
              <p className="font-montserrat font-semibold text-[12px] text-foreground">{row.label}</p>
              <p className={cn("font-montserrat font-semibold text-[12px]", TONE_CLASSES[row.tone])}>{row.value}</p>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 pt-1 font-montserrat text-[11px] text-muted-foreground">
            <p>Revenue, profit and trips count by departure date; FET and cash by payment date; AR and AP as of today.</p>
            {caveats.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      )}
    </DarkPanel>
  );
}
