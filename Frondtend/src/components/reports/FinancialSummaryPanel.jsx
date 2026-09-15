"use client";

import { cn } from "@/lib/utils";
import { useReportsStore } from "@/store/useReportsStore";
import DarkPanel from "@/components/common/DarkPanel";

const TONE_CLASSES = {
  success: "text-success",
  info: "text-info",
  purple: "text-purple",
  destructive: "text-destructive",
  warning: "text-warning",
  foreground: "text-foreground",
};

export default function FinancialSummaryPanel() {
  const data = useReportsStore((s) => s.financialSummary);
  return (
    <DarkPanel title="Financial Summary" bodyClassName="p-3 sm:p-4">
      <div className="flex flex-col gap-2 w-full">
        {data.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 border border-border rounded-sm px-2 py-1"
          >
            <p className="font-montserrat font-semibold text-[12px] text-foreground">{row.label}</p>
            <p className={cn("font-montserrat font-semibold text-[12px]", TONE_CLASSES[row.tone])}>{row.value}</p>
          </div>
        ))}
      </div>
    </DarkPanel>
  );
}
