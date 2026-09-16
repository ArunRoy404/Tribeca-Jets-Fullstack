"use client";

import { Archive, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useRemoveClient } from "@/hooks/clients";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Replaces DeleteLeadDialog, which promised the lead would be "permanently
 * removed". Nothing in this system is destroyed — and a lead is a client, so
 * this archives the client record and it can be restored with everything
 * attached.
 */
export default function ArchiveLeadDialog() {
  const open = useLeadsAgentsStore((s) => s.archiveLeadModalOpen);
  const lead = useLeadsAgentsStore((s) => s.archivingLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeArchiveLeadModal);
  const { mutate: removeClient, isPending } = useRemoveClient();

  if (!lead) return null;

  const handleArchive = () =>
    removeClient({ id: lead.id, name: lead.name }, { onSuccess: closeModal });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-115 p-6 flex flex-col items-start gap-4">
        <div className="flex items-start gap-3 w-full">
          <div className="size-11 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
            <Archive className="size-5" />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Archive Lead?
            </DialogTitle>
            <DialogDescription className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
              Archive <span className="font-bold text-foreground">{lead.name}</span>?
              They move to the Archived tab and can be restored at any time, with
              their enquiries and follow-ups intact.
              <span className="block pt-2">
                If the deal simply did not happen, set the stage to{" "}
                <span className="font-semibold text-foreground">Lost</span>{" "}
                instead — that keeps them in the pipeline history and in the
                conversion figures.
              </span>
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
            disabled={isPending}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-2"
            onClick={handleArchive}
            disabled={isPending}
          >
            <Archive className="size-4" />
            {isPending ? "Archiving…" : "Archive"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
