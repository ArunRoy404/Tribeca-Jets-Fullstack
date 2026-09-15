"use client";

import { Trash2, X } from "lucide-react";
import { useReceivablesStore } from "@/store/useReceivablesStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteReceivableDialog() {
  const open = useReceivablesStore((s) => s.deleteModalOpen);
  const deleteTargetId = useReceivablesStore((s) => s.deleteTargetId);
  const closeModal = useReceivablesStore((s) => s.closeDeleteModal);
  const getReceivableById = useReceivablesStore((s) => s.getReceivableById);
  const deleteReceivable = useReceivablesStore((s) => s.deleteReceivable);

  const item = deleteTargetId ? getReceivableById(deleteTargetId) : null;
  const invoiceLabel = item ? item.invoice : "this record";

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteReceivable(deleteTargetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-125 p-6 flex flex-col gap-4 bg-white border border-border rounded-xl shadow-2xl">
        {/* Header row with red Trash icon badge */}
        <DialogHeader className="flex flex-col items-start gap-3 w-full text-left">
          <div className="flex items-center gap-3.5 w-full">
            <div className="size-10 rounded-full bg-red-50 border border-red-200 text-destructive flex items-center justify-center shrink-0">
              <Trash2 className="size-4.5" />
            </div>
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-left">
              Delete Record?
            </DialogTitle>
          </div>

          <DialogDescription className="font-montserrat text-[13.5px] text-muted-foreground text-left leading-relaxed pt-1">
            Archive <span className="font-semibold text-foreground">{invoiceLabel}</span>? It will be marked cancelled and removed from active views.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/60 w-full my-1" />

        {/* Right aligned action buttons */}
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 px-4 h-10 font-montserrat font-medium text-[13px]"
            onClick={closeModal}
          >
            <X className="size-4" />
            Cancel
          </Button>

          <Button
            type="button"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white gap-1.5 px-5 h-10 font-montserrat font-medium text-[13px] shadow-sm"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
