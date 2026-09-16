"use client";

import { Archive, X } from "lucide-react";
import { useAircraftStore } from "@/store/useAircraftStore";
import { useRemoveAircraft } from "@/hooks/aircraft";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Replaces the old DeleteAircraftDialog, which promised "this cannot be
 * undone". Nothing in this system is destroyed — removing archives the row,
 * and it can be brought back with its history intact.
 */
export default function ArchiveAircraftDialog() {
  const open = useAircraftStore((s) => s.archiveModalOpen);
  const aircraft = useAircraftStore((s) => s.archivingAircraft);
  const closeModal = useAircraftStore((s) => s.closeArchiveModal);
  const { mutate: removeAircraft, isPending } = useRemoveAircraft();

  if (!aircraft) return null;

  const handleArchive = () => removeAircraft(aircraft, { onSuccess: closeModal });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-115 p-6 flex flex-col items-start gap-4">
        <div className="flex items-start gap-3 w-full">
          <div className="size-11 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
            <Archive className="size-5" />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Archive Aircraft?
            </DialogTitle>
            <DialogDescription className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
              Archive{" "}
              <span className="font-bold text-foreground">
                {aircraft.model} ({aircraft.tailNumber})
              </span>
              ? It moves to the Archived tab and can be restored at any time.
              Quotes and trips that reference it keep working.
              {/* The distinction that actually matters on a charter desk: a
                  tail that has left the fleet is still a tail, and archiving
                  it hides history someone will need. */}
              <span className="block pt-2">
                To take it out of service without removing it, set its status to{" "}
                <span className="font-semibold text-foreground">Inactive</span>{" "}
                instead — it stays listed and searchable.
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
