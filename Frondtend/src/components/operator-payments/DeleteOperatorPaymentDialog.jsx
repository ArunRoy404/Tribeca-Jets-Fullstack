"use client";

import { Trash2, X } from "lucide-react";
import { useOperatorPaymentsStore } from "@/store/useOperatorPaymentsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteOperatorPaymentDialog() {
  const open = useOperatorPaymentsStore((s) => s.deleteModalOpen);
  const deleteTargetId = useOperatorPaymentsStore((s) => s.deleteTargetId);
  const closeModal = useOperatorPaymentsStore((s) => s.closeDeleteModal);
  const getPaymentById = useOperatorPaymentsStore((s) => s.getPaymentById);
  const deleteOperatorPayment = useOperatorPaymentsStore((s) => s.deleteOperatorPayment);

  const item = deleteTargetId ? getPaymentById(deleteTargetId) : null;
  const paymentLabel = item ? item.id : "this record";

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteOperatorPayment(deleteTargetId);
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
            Archive <span className="font-semibold text-foreground">{paymentLabel}</span>? It will be marked cancelled and removed from active views.
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
