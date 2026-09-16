"use client";

import { Trash2, X } from "lucide-react";
import { useAirportsStore } from "@/store/useAirportsStore";
import { useRemoveAirport } from "@/hooks/airports";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeleteAirportDialog() {
  const open = useAirportsStore((s) => s.deleteModalOpen);
  const deletingAirport = useAirportsStore((s) => s.deletingAirport);
  const closeModal = useAirportsStore((s) => s.closeDeleteModal);
  const { mutate: removeAirport, isPending } = useRemoveAirport();

  const airportName = deletingAirport
    ? `${deletingAirport.name} (${deletingAirport.icao})`
    : "this airport";

  const handleDelete = () => {
    if (!deletingAirport) return;
    removeAirport(deletingAirport, { onSuccess: closeModal });
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
              Remove Airport?
            </DialogTitle>
          </div>

          <DialogDescription className="font-montserrat text-[14px] text-muted-foreground text-left leading-relaxed pt-1">
            Remove <span className="font-bold text-foreground">{airportName}</span> from the
            airport list? Trips and itineraries that reference it keep working, and you
            can bring it back any time from the Archived tab.
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
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
