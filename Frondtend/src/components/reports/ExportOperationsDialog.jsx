"use client";

import { X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReportsStore } from "@/store/useReportsStore";
import { reportsExportFormatOptions } from "@/dummyData/reports";
import { cn } from "@/lib/utils";

const scopeOptions = [
  { value: "current", label: "Export current view", description: "Only the operations matching your active filters" },
  { value: "all", label: "Export all operations", description: (count) => `All ${count} operations regardless of filters` },
];

export default function ExportOperationsDialog() {
  const open = useReportsStore((s) => s.exportModalOpen);
  const close = useReportsStore((s) => s.closeExportModal);
  const exportScope = useReportsStore((s) => s.exportScope);
  const setExportScope = useReportsStore((s) => s.setExportScope);
  const exportFormat = useReportsStore((s) => s.exportFormat);
  const setExportFormat = useReportsStore((s) => s.setExportFormat);
  const totalOperationsCount = useReportsStore((s) => s.totalOperationsCount);

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

        <div className="flex flex-col border border-[#d4d7e2] rounded-lg overflow-hidden">
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
                    active ? "border-warning bg-[#fdfbf8]" : "border-border bg-white"
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
                      {typeof option.description === "function" ? option.description(totalOperationsCount) : option.description}
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
            {reportsExportFormatOptions.map((format) => (
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
                {format}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-sm border border-border bg-secondary p-4">
          <p className="font-dm-sans font-normal text-[12px] text-muted-foreground">
            Your export will include the fields currently available in the operations data.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-secondary pt-4">
          <Button variant="outline" className="h-9 px-4 gap-2 text-[14px]" onClick={close}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button className="h-9 px-4 gap-2 text-[14px]" onClick={close}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
