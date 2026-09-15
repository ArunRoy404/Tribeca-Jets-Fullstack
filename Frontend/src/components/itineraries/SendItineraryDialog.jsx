"use client";

import { Send, X } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SendItineraryDialog() {
  const open = useItinerariesStore((s) => s.sendModalOpen);
  const sendTargetId = useItinerariesStore((s) => s.sendTargetId);
  const closeModal = useItinerariesStore((s) => s.closeSendModal);
  const getItineraryById = useItinerariesStore((s) => s.getItineraryById);

  const item = sendTargetId ? getItineraryById(sendTargetId) : null;
  const tripId = item?.id || "TJ-1040";
  const clientName = item?.client || "Kevin Monroe";

  const handleSend = () => {
    alert(`Itinerary ${tripId} successfully sent to ${clientName}!`);
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-125 p-6 text-center flex flex-col items-center gap-4">
        {/* Icon */}
        <div className="size-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success">
          <Send className="size-5" />
        </div>

        <DialogHeader className="flex flex-col items-center gap-1.5">
          <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-center">
            Send itinerary to client
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground text-center max-w-sm">
            Email the itinerary for <span className="font-bold text-foreground">{tripId}</span> to{" "}
            <span className="font-bold text-foreground">{clientName}</span>? A sent-confirmation will be logged to the activity trail.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 pt-2 w-full">
          <Button type="button" variant="outline" className="gap-1.5 px-5" onClick={closeModal}>
            <X className="size-4" />
            Cancel
          </Button>

          <Button type="button" className="gap-1.5 px-6" onClick={handleSend}>
            <Send className="size-4" />
            Send Itinerary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
