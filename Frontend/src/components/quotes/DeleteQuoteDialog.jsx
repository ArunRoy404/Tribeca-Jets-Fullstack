"use client";

import { AlertTriangle, Archive, X } from "lucide-react";
import { useQuotesStore } from "@/store/useQuotesStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRemoveQuote } from "@/hooks/quotes";

/**
 * Archives one quote.
 *
 * It does **not** say "this cannot be undone", because it can: there is no hard
 * delete in this system. The quote moves to the Archived tab with its version
 * history intact and can be restored. Telling someone an action is permanent
 * when it is not makes them avoid the right action and reach for a worse one.
 */
export default function DeleteQuoteDialog() {
  const open = useQuotesStore((s) => s.deleteModalOpen);
  const target = useQuotesStore((s) => s.deleteTargetQuote);
  const closeModal = useQuotesStore((s) => s.closeDeleteQuoteModal);
  const { mutate: removeQuote, isPending } = useRemoveQuote();

  if (!target) return null;

  const handleRemove = () =>
    removeQuote(target.id, { onSuccess: () => closeModal() });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-md p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Remove Quote
            </DialogTitle>
          </div>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground pt-1">
            Move quote{" "}
            <strong className="text-foreground">{target.reference}</strong> for{" "}
            <strong className="text-foreground">{target.client}</strong> to the
            Archived tab? Nothing is destroyed — you can restore it later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-[13px] font-montserrat text-muted-foreground">
          <p>
            <strong>Route:</strong> {target.route} ({target.departure})
          </p>
          <p>
            <strong>Total:</strong> {target.total}
          </p>
          {/* The distinction that keeps the conversion rate honest. */}
          <p className="text-[12px] pt-1 border-t border-destructive/10">
            If the client turned this quote down, mark it{" "}
            <strong className="text-foreground">Client Declined</strong> instead
            — a rejected quote stays in the history the desk’s win rate is
            counted from.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 font-medium text-[13px] gap-1.5"
            onClick={closeModal}
            disabled={isPending}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-9 px-4 font-medium text-[13px] gap-1.5"
            onClick={handleRemove}
            disabled={isPending}
          >
            <Archive className="size-3.5" />
            {isPending ? "Removing..." : "Remove Quote"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
