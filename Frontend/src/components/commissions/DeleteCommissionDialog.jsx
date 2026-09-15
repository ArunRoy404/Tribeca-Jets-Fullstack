"use client";

import { X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCommissionsStore } from "@/store/useCommissionsStore";

export default function DeleteCommissionDialog() {
  const open = useCommissionsStore((s) => s.deleteModalOpen);
  const close = useCommissionsStore((s) => s.closeDeleteModal);
  const targetId = useCommissionsStore((s) => s.deleteTargetId);
  const getCommissionById = useCommissionsStore((s) => s.getCommissionById);
  const deleteCommission = useCommissionsStore((s) => s.deleteCommission);

  const item = targetId ? getCommissionById(targetId) : null;

  const handleDelete = () => {
    if (targetId) {
      deleteCommission(targetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border rounded-xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/80">
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
            Archive Commission
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-4">
          <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
            Are you sure you want to archive commission record{" "}
            <span className="font-bold text-foreground">{item ? item.id : ""}</span> for{" "}
            <span className="font-bold text-purple">{item ? item.recipient : ""}</span>? This action can be undone from settings.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              className="h-10 px-5 font-montserrat font-medium text-[13px] gap-1.5"
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white h-10 px-5 font-montserrat font-semibold text-[13px] gap-2 shadow-sm"
            >
              <Trash2 className="size-4" />
              Archive Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
