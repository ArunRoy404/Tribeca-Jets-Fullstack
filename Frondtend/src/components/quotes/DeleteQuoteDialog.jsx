"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useQuotesStore } from "@/store/useQuotesStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteQuoteDialog() {
  const open = useQuotesStore((s) => s.deleteModalOpen);
  const targetQuote = useQuotesStore((s) => s.deleteTargetQuote);
  const closeModal = useQuotesStore((s) => s.closeDeleteQuoteModal);
  const deleteQuote = useQuotesStore((s) => s.deleteQuote);

  if (!targetQuote) return null;

  const handleDelete = () => {
    deleteQuote(targetQuote.id);
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-md p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Delete Quote
            </DialogTitle>
          </div>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground pt-1">
            Are you sure you want to delete quote <strong className="text-foreground">{targetQuote.id}</strong> for <strong className="text-foreground">{targetQuote.client}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-[13px] font-montserrat text-muted-foreground">
          <p>
            <strong>Route:</strong> {targetQuote.route} ({targetQuote.date})
          </p>
          <p>
            <strong>Total Amount:</strong> {targetQuote.totalPriceFormatted}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 font-medium text-[13px] gap-1.5 cursor-pointer"
            onClick={closeModal}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-9 px-4 font-medium text-[13px] gap-1.5 cursor-pointer"
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
            Delete Quote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

