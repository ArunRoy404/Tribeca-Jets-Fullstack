"use client";

import { Download, ChevronDown } from "lucide-react";
import { useReportsStore } from "@/store/useReportsStore";
import { reportsPeriodOptions, reportsMonthOptions } from "@/dummyData/reports";
import FilterTabs from "@/components/table/common/FilterTabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ReportsToolbar() {
  const period = useReportsStore((s) => s.period);
  const setPeriod = useReportsStore((s) => s.setPeriod);
  const selectedMonth = useReportsStore((s) => s.selectedMonth);
  const setSelectedMonth = useReportsStore((s) => s.setSelectedMonth);
  const openExportModal = useReportsStore((s) => s.openExportModal);
  const setExportFormat = useReportsStore((s) => s.setExportFormat);

  const handleExport = (format) => {
    setExportFormat(format);
    openExportModal();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <FilterTabs options={reportsPeriodOptions} value={period} onValueChange={setPeriod} />

        <Popover>
          <PopoverTrigger className="flex items-center gap-1 h-[33px] bg-secondary border border-border rounded-sm px-2 font-montserrat font-medium text-[10px] text-foreground cursor-pointer outline-none">
            {selectedMonth}
            <ChevronDown className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-1.5">
            {reportsMonthOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedMonth(option)}
                className="flex w-full items-center rounded-md px-2 py-1.5 font-montserrat text-[12px] text-foreground hover:bg-muted cursor-pointer data-active:bg-muted"
                data-active={option === selectedMonth || undefined}
              >
                {option}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="outline" className="h-[35px] px-4 gap-2 text-[13px] sm:text-[14px]" onClick={() => handleExport("PDF")}>
          <Download className="size-4" />
          Export PDF
        </Button>
        <Button variant="outline" className="h-[35px] px-4 gap-2 text-[13px] sm:text-[14px]" onClick={() => handleExport("EXCEL")}>
          <Download className="size-4" />
          Export Excel
        </Button>
      </div>
    </div>
  );
}
