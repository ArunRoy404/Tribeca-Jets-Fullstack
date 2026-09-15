"use client";

import { Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Confirms removing several rows, listing exactly which ones.
 *
 * The list is the point. "Delete 12 items?" asks someone to trust a count they
 * cannot check, and a mis-click on the select-all checkbox looks identical to a
 * deliberate selection. Naming the rows makes a wrong selection visible before
 * it is acted on.
 *
 * Shared across modules: it takes already-labelled items rather than records,
 * so each table decides what its own primary and secondary lines say.
 *
 * @param items `[{ id, primary, secondary? }]` — what to list.
 */
export default function BulkDeleteDialog({
  open,
  onOpenChange,
  items = [],
  itemLabel = "items",
  onConfirm,
  isPending = false,
  note,
}) {
  const count = items.length;
  const noun = count === 1 ? itemLabel.replace(/s$/, "") : itemLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-3 w-full">
          <div className="flex items-center gap-3.5 w-full">
            <div className="size-10 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center shrink-0">
              <Trash2 className="size-4.5" />
            </div>
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-left">
              Remove {count} {noun}?
            </DialogTitle>
          </div>

          <DialogDescription className="font-montserrat text-[14px] text-muted-foreground text-left leading-relaxed pt-1">
            {note ??
              `These ${noun} will be removed from the list. Records that reference them keep working.`}
          </DialogDescription>
        </DialogHeader>

        {/* Capped height: selecting a full page of 100 must not push the
            confirm button off the bottom of the screen. */}
        <ul className="flex flex-col gap-1 max-h-56 overflow-y-auto rounded-sm border border-border bg-secondary/30 p-3 w-full">
          {items.map((item) => (
            <li
              key={item?.id}
              className="flex items-baseline justify-between gap-3 font-montserrat text-[12px]"
            >
              <span className="font-semibold text-foreground truncate">
                {item?.primary}
              </span>
              {item?.secondary ? (
                <span className="text-muted-foreground truncate shrink-0">
                  {item.secondary}
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 px-4 h-10 font-medium text-[13px]"
            onClick={() => onOpenChange?.(false)}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="gap-1.5 px-5 h-10 font-medium text-[13px]"
            onClick={onConfirm}
            disabled={isPending || count === 0}
          >
            <Trash2 className="size-4" />
            {isPending ? "Removing…" : `Remove ${count}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
