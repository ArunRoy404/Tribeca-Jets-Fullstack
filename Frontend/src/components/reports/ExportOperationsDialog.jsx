"use client";

import { X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReportsStore } from "@/store/useReportsStore";
import { useReportSummary, useReportsParams } from "@/hooks/reports";
import { EXPORT_FORMATS, EXPORT_FORMAT_LABELS } from "@/lib/reports";
import { reportExportUrl } from "@/services/reports.service";
import { cn } from "@/lib/utils";

const scopeOptions = [
  {
    value: "current",
    label: "Export current view",
    description: (counts) => `The ${counts?.window ?? "—"} operations departing in the period on screen`,
  },
  {
    value: "all",
    label: "Export all operations",
    description: (counts) => `All ${counts?.allTime ?? "—"} operations on record, regardless of period`,
  },
];

export default function ExportOperationsDialog() {
  const open = useReportsStore((s) => s.exportModalOpen);
  const close = useReportsStore((s) => s.closeExportModal);
  const exportScope = useReportsStore((s) => s.exportScope);
  const setExportScope = useReportsStore((s) => s.setExportScope);
  const exportFormat = useReportsStore((s) => s.exportFormat);
  const setExportFormat = useReportsStore((s) => s.setExportFormat);
  const { window } = useReportsParams();
  const { data: summary } = useReportSummary(window);
  const counts = summary?.operations;

  // A real download the browser follows, so the session cookie goes with it.
  const download = () => {
    const link = document.createElement("a");
    link.href = reportExportUrl({ ...(exportScope === "current" ? window : {}), format: exportFormat });
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg p-6 gap-4 bg-white border-0 rounded-2xl shadow-2xl" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-secondary pb-4">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text">Export Operations</DialogTitle>
          <button
            onClick={close}
            className="flex items-center justify-center rounded-full size-6 text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="flex flex-col border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
            <p className="font-montserrat font-bold text-[16px] text-muted-foreground">Scope</p>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {scopeOptions.map((option) => {
              const active = exportScope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExportScope(option.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 text-left cursor-pointer transition-colors",
                    active ? "border-warning bg-warning/5" : "border-border bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex items-center justify-center rounded-full size-5 border-2 shrink-0",
                      active ? "border-foreground" : "border-border"
                    )}
                  >
                    {active && <span className="size-2.5 rounded-full bg-foreground" />}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-montserrat font-medium text-[16px] text-ink">{option.label}</span>
                    <span className="font-montserrat font-normal text-[12px] text-slate">
                      {option.description(counts)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-montserrat font-medium text-[16px] text-foreground">Format</p>
          <div className="flex items-center gap-2">
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setExportFormat(format)}
                className={cn(
                  "h-9 px-4 rounded-sm border font-montserrat font-medium text-[14px] cursor-pointer transition-colors",
                  format === exportFormat
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-white border-border text-foreground hover:bg-muted"
                )}
              >
                {EXPORT_FORMAT_LABELS[format]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-sm border border-border bg-secondary p-4">
          <p className="font-dm-sans font-normal text-[12px] text-muted-foreground">
            One row per booked or flown trip: reference, departure, status, client, broker, route, aircraft, operator,
            revenue, FET, operator cost, profit and margin. A figure not yet known is left blank, never zero.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-secondary pt-4">
          <Button variant="outline" className="h-9 px-4 gap-2 text-[14px]" onClick={close}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button className="h-9 px-4 gap-2 text-[14px]" onClick={download}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
