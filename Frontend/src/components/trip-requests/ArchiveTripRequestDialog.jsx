"use client";

import { Archive, X } from "lucide-react";
import { useTripRequestsStore } from "@/store/useTripRequestsStore";
import { useRemoveTripRequest } from "@/hooks/trip-requests";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Archives an enquiry.
 *
 * Named "archive", not "delete": nothing in this system is destroyed, and this
 * one matters more than most. The client's whole reason for wanting this page
 * was that most requests never book and the data is still worth keeping — so
 * the dialog says where the row goes rather than warning it cannot be undone.
 *
 * It also points at the alternative, because archiving is almost never what
 * someone means here. A request that went nowhere is **Lost**, which keeps it
 * in the pipeline history and in the conversion figures; archiving is for a row
 * that should not have been filed at all.
 */
export default function ArchiveTripRequestDialog() {
  const open = useTripRequestsStore((s) => s.archiveModalOpen);
  const request = useTripRequestsStore((s) => s.archivingRequest);
  const close = useTripRequestsStore((s) => s.closeArchiveModal);
  const { mutate: removeRequest, isPending } = useRemoveTripRequest();

  if (!request) return null;

  const handleArchive = () => removeRequest(request, { onSuccess: close });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-115 p-6 flex flex-col items-start gap-4">
        <div className="flex items-start gap-3 w-full">
          <div className="size-11 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
            <Archive className="size-5" />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Archive Trip Request?
            </DialogTitle>
            <DialogDescription className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
              Archive{" "}
              <span className="font-bold text-foreground">
                {request.reference}
              </span>
              {request.clientName ? (
                <>
                  {" "}for{" "}
                  <span className="font-bold text-foreground">{request.clientName}</span>
                </>
              ) : null}
              ? It moves to the Archived tab and can be restored at any time.
              <span className="block pt-2">
                If the enquiry simply went nowhere, set its status to{" "}
                <span className="font-semibold text-foreground">Lost</span>{" "}
                instead — it stays in the log, which is what makes it findable
                when an empty leg matches it later.
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
            onClick={close}
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
