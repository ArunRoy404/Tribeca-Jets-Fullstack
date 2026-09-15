"use client";

import { Trash2, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteLeadDialog() {
  const open = useLeadsAgentsStore((s) => s.deleteLeadModalOpen);
  const targetLead = useLeadsAgentsStore((s) => s.deleteLeadTargetLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeDeleteLeadModal);
  const deleteLead = useLeadsAgentsStore((s) => s.deleteLead);

  const handleDelete = () => {
    if (!targetLead) return;
    deleteLead(targetLead.id);
    closeModal();
  };

  if (!targetLead && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-130 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-3">
          <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
            <Trash2 className="size-5" />
          </div>
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
            Delete Lead?
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
            Delete <strong className="font-bold text-foreground">{targetLead?.name}</strong>? This will
            be hidden from the active lead list but all Lead history and data will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 font-medium text-[13px] gap-1.5"
            onClick={closeModal}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="h-9 px-5 font-medium text-[13px] gap-1.5 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            Delete Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

