"use client";

import { X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTransactionsStore } from "@/store/useTransactionsStore";

export default function DeleteTransactionDialog() {
  const open = useTransactionsStore((s) => s.deleteModalOpen);
  const close = useTransactionsStore((s) => s.closeDeleteModal);
  const targetId = useTransactionsStore((s) => s.deleteTargetId);
  const getTransactionById = useTransactionsStore((s) => s.getTransactionById);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);

  const item = targetId ? getTransactionById(targetId) : null;

  const handleDelete = () => {
    if (targetId) {
      deleteTransaction(targetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl gap-4 bg-white border border-border shadow-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-destructive shrink-0">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
            Delete Record?
          </DialogTitle>
        </DialogHeader>

        <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
          Archive <span className="font-semibold text-foreground">{item ? item.reference : "this record"}</span>? It will be marked cancelled and removed from active views.
        </p>

        <div className="border-t border-border flex items-center justify-end gap-2 pt-4 w-full">
          <Button type="button" variant="outline" className="gap-2 px-4" onClick={close}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            className="bg-[#252832] hover:bg-[#252832]/90 text-white gap-2 px-4 shadow-sm"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
