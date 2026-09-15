"use client";

import { Trash2, X } from "lucide-react";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteEmptyLegDialog() {
  const open = useEmptyLegsStore((s) => s.deleteModalOpen);
  const deleteTargetId = useEmptyLegsStore((s) => s.deleteTargetId);
  const closeModal = useEmptyLegsStore((s) => s.closeDeleteModal);
  const getLegById = useEmptyLegsStore((s) => s.getLegById);
  const deleteEmptyLeg = useEmptyLegsStore((s) => s.deleteEmptyLeg);

  const item = deleteTargetId ? getLegById(deleteTargetId) : null;
  const legLabel = item ? `${item.origin} → ${item.destination}` : "this empty leg";

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteEmptyLeg(deleteTargetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-130 p-6 flex flex-col gap-4">
        {/* Left aligned header row with red icon badge */}
        <DialogHeader className="flex flex-col items-start gap-3 w-full">
          <div className="flex items-center gap-3.5 w-full">
            <div className="size-10 rounded-full bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-center shrink-0">
              <Trash2 className="size-4.5" />
            </div>
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-left">
              Delete empty leg
            </DialogTitle>
          </div>

          <DialogDescription className="font-montserrat text-[14px] text-muted-foreground text-left leading-relaxed pt-1">
            Delete the <span className="font-bold text-foreground">{legLabel}</span> empty leg? This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/40 w-full" />

        {/* Right aligned action buttons */}
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 px-4 h-10 font-medium text-[13px]"
            onClick={closeModal}
          >
            <X className="size-4" />
            Cancel
          </Button>

          <Button
            type="button"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white gap-1.5 px-5 h-10 font-medium text-[13px]"
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
