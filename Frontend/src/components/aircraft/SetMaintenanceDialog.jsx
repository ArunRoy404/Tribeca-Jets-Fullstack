"use client";

import { Wrench, X, CheckCircle2 } from "lucide-react";
import { useAircraftStore } from "@/store/useAircraftStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SetMaintenanceDialog() {
  const open = useAircraftStore((s) => s.maintenanceModalOpen);
  const target = useAircraftStore((s) => s.maintenanceTargetAircraft);
  const closeMaintenanceModal = useAircraftStore((s) => s.closeMaintenanceModal);
  const toggleMaintenanceStatus = useAircraftStore((s) => s.toggleMaintenanceStatus);

  if (!target) return null;

  const isMaintenance = target.status === "Maintenance";
  const aircraftName = `${target.model} (${target.tail})`;

  const handleConfirm = () => {
    toggleMaintenanceStatus(target.id, isMaintenance ? "Available" : "Maintenance");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeMaintenanceModal()}>
      <DialogContent className="sm:max-w-140 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-3 w-full">
          <div className="flex items-center gap-3.5 w-full">
            <div
              className={`size-10 rounded-full flex items-center justify-center shrink-0 border ${
                isMaintenance
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-warning/10 border-warning/30 text-warning"
              }`}
            >
              {isMaintenance ? <CheckCircle2 className="size-5" /> : <Wrench className="size-5" />}
            </div>
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-left">
              {isMaintenance ? "Mark Aircraft Available" : "Set Aircraft to Maintenance"}
            </DialogTitle>
          </div>

          <DialogDescription className="font-montserrat text-[14px] text-muted-foreground text-left leading-relaxed pt-1">
            {isMaintenance ? (
              <>
                Mark <span className="font-bold text-foreground">{aircraftName}</span> as available? It will return to active fleet service and become available for new quotes and trips.
              </>
            ) : (
              <>
                Put <span className="font-bold text-foreground">{aircraftName}</span> into maintenance? It will be unavailable for trips until marked Available again.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/40 w-full" />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 px-4 h-10 font-medium text-[13px]"
            onClick={closeMaintenanceModal}
          >
            <X className="size-4" />
            Cancel
          </Button>

          <Button
            type="button"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white gap-1.5 px-5 h-10 font-medium text-[13px]"
            onClick={handleConfirm}
          >
            {isMaintenance ? <CheckCircle2 className="size-4" /> : <Wrench className="size-4" />}
            {isMaintenance ? "Mark Available" : "Set Maintenance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
