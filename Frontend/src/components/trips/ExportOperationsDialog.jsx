"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SCOPE_OPTIONS = [
  { value: "current", label: "Export current view", description: "Only the operations matching your active filters" },
  { value: "all", label: "Export all operations", description: "All 16 operations regardless of filters" },
];

const FORMAT_OPTIONS = ["CSV", "EXCEL", "PDF"];

export default function ExportOperationsDialog({ open, onOpenChange }) {
  const [scope, setScope] = useState("current");
  const [format, setFormat] = useState("CSV");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-montserrat text-[18px] font-bold text-foreground">Export Operations</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border p-3">
            <p className="font-montserrat font-semibold text-[13px] text-foreground mb-3">Scope</p>
            <div className="flex flex-col gap-2">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setScope(option.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-sm border p-3 text-left cursor-pointer",
                    scope === option.value ? "border-warning bg-warning/10" : "border-border bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                      scope === option.value ? "border-foreground" : "border-border"
                    )}
                  >
                    {scope === option.value && <span className="size-2 rounded-full bg-foreground" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-montserrat font-semibold text-[13px] text-foreground">{option.label}</span>
                    <span className="font-montserrat text-[12px] text-muted-foreground">{option.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-montserrat font-semibold text-[13px] text-foreground">Format</p>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "flex-1 rounded-sm border px-3 py-2 font-montserrat font-medium text-[13px] cursor-pointer",
                    format === f ? "bg-primary text-primary-foreground border-primary" : "border-border bg-white text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <p className="rounded-sm bg-secondary p-3 font-montserrat text-[12px] text-muted-foreground">
            Your export will include the fields currently available in the operations data.
          </p>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-0 border-t border-border bg-transparent p-4 rounded-b-xl sm:justify-between">
          <Button variant="outline" className="px-4" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2 px-4" onClick={() => onOpenChange(false)}>
            <Download className="size-3.5" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
