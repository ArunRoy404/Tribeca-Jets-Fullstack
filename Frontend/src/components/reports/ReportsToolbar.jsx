"use client";

import { useMemo } from "react";
import { Download, ChevronDown } from "lucide-react";
import { useReportsStore } from "@/store/useReportsStore";
import { useReportsParams } from "@/hooks/reports";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { REPORT_PERIODS, REPORT_PERIOD_LABELS, rangeLabel, reportRangeOptions } from "@/lib/reports";
import FilterTabs from "@/components/table/common/FilterTabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PERIOD_BY_LABEL = Object.fromEntries(REPORT_PERIODS.map((period) => [REPORT_PERIOD_LABELS[period], period]));

/**
 * The report's window — a period tab or a picked month, quarter or YTD —
 * and the export. PDF is not offered: nothing in this system generates one
 * yet (MODULE_FEATURE_STATUS.md, Reports).
 */
export default function ReportsToolbar() {
  const { period, range, setPeriod, setRange } = useReportsParams();
  const openExportModal = useReportsStore((s) => s.openExportModal);
  const { can } = usePermissions();
  const rangeOptions = useMemo(() => reportRangeOptions(), []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <FilterTabs
          options={REPORT_PERIODS.map((value) => REPORT_PERIOD_LABELS[value])}
          // No tab is active while a picked range is in force.
          value={period ? REPORT_PERIOD_LABELS[period] : null}
          onValueChange={(label) => setPeriod(PERIOD_BY_LABEL[label])}
        />

        <Popover>
          <PopoverTrigger className="flex items-center gap-1 h-[33px] bg-secondary border border-border rounded-sm px-2 font-montserrat font-medium text-[10px] text-foreground cursor-pointer outline-none">
            {rangeLabel(range) ?? "Pick a month or quarter"}
            <ChevronDown className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-1.5">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className="flex w-full items-center rounded-md px-2 py-1.5 font-montserrat text-[12px] text-foreground hover:bg-muted cursor-pointer data-active:bg-muted"
                data-active={option.value === range || undefined}
              >
                {option.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {can(Permission.EXPORT_DATA) && (
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="outline" className="h-[35px] px-4 gap-2 text-[13px] sm:text-[14px]" onClick={() => openExportModal("CSV")}>
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="h-[35px] px-4 gap-2 text-[13px] sm:text-[14px]" onClick={() => openExportModal("XLSX")}>
            <Download className="size-4" />
            Export Excel
          </Button>
        </div>
      )}
    </div>
  );
}
