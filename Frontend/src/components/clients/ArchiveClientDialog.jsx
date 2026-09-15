"use client";

import { Archive, X } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ArchiveClientDialog() {
  const open = useClientsStore((s) => s.archiveModalOpen);
  const client = useClientsStore((s) => s.archiveTargetClient);
  const closeModal = useClientsStore((s) => s.closeArchiveModal);
  const archiveClient = useClientsStore((s) => s.archiveClient);

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-115 p-6 flex flex-col items-start gap-4">
        <div className="flex items-start gap-3 w-full">
          <div className="size-11 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
            <Archive className="size-5" />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Archive Client?
            </DialogTitle>
            <DialogDescription className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
              Archive <span className="font-bold text-foreground">{client.name}</span>? They will be hidden from the active client list but all trip history and data will be preserved.
            </DialogDescription>
          </div>
        </div>

        <div className="w-full border-t border-border my-1" />

        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 font-medium text-[13px] gap-1.5"
            onClick={closeModal}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-2"
            onClick={() => archiveClient(client.id)}
          >
            <Archive className="size-4" />
            Archive
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
