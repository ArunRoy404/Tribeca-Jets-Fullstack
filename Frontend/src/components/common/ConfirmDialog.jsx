"use client";

import { AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * A yes/no question in the app's own dialog — never the browser's
 * `window.confirm`, which cannot be styled, blocks the page and reads as an
 * error. `tone="destructive"` paints the confirm button red for an action
 * that loses something.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
}) {
  const destructive = tone === "destructive";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-110 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-3 w-full">
          <div className="flex items-center gap-3.5 w-full">
            <div
              className={
                destructive
                  ? "size-10 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center shrink-0"
                  : "size-10 rounded-full bg-warning/10 border border-warning/30 text-warning flex items-center justify-center shrink-0"
              }
            >
              <AlertTriangle className="size-4.5" />
            </div>
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-left">{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="font-montserrat text-[14px] text-muted-foreground text-left leading-relaxed pt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex items-center justify-end gap-3 w-full">
          <Button type="button" variant="outline" className="gap-1.5 px-4 h-10 font-medium text-[13px]" onClick={() => onOpenChange?.(false)}>
            <X className="size-4" />
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="px-5 h-10 font-medium text-[13px]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
