"use client";

import { useState } from "react";
import { Check, Mail, Send, X } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { useItinerary, useSendItinerary } from "@/hooks/itineraries";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toItineraryRow } from "@/lib/itinerary";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Sending the itinerary to the client. Two acts, said apart: **Email it**
 * (Email Templates, #21) sends the trip's details through the shared compose
 * form and, once the email is accepted, marks the document sent; **Mark as
 * sent** records a hand-off made another way — a PDF by WhatsApp, a call —
 * and delivers nothing. The document itself is not attached: the email
 * carries the trip's facts, filled by the API.
 */
export default function SendItineraryDialog() {
  const open = useItinerariesStore((s) => s.sendModalOpen);
  const sendTargetId = useItinerariesStore((s) => s.sendTargetId);
  const closeModal = useItinerariesStore((s) => s.closeSendModal);
  // What the compose form is sending, kept here: closing this dialog clears
  // the store's target, and the email must still know which document it is.
  const [composeFor, setComposeFor] = useState(null);

  const { data: item } = useItinerary(open ? sendTargetId : null);
  const row = item ? toItineraryRow(item) : null;
  const { mutate: markSent, isPending } = useSendItinerary();
  const { canWrite } = usePermissions();
  const maySend = canWrite(Permission.SEND_EMAILS) && Boolean(row?.clientId);

  const handleMark = () => markSent(sendTargetId, { onSuccess: () => closeModal() });
  const openCompose = () => {
    setComposeFor({ id: sendTargetId, clientId: row?.clientId, tripId: row?.tripId });
    closeModal();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="sm:max-w-125 p-6 text-center flex flex-col items-center gap-4">
          <div className="size-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success">
            <Send className="size-5" />
          </div>

          <DialogHeader className="flex flex-col items-center gap-1.5">
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground text-center">
              Send itinerary to client
            </DialogTitle>
            <DialogDescription className="font-montserrat text-[13px] text-muted-foreground text-center max-w-sm">
              {maySend ? (
                <>
                  Email <span className="font-bold text-foreground">{row?.client ?? "—"}</span> the details of{" "}
                  <span className="font-bold text-foreground">{row?.tripReference ?? "—"}</span>, or mark it sent if it
                  went to them another way — marking it records the act and delivers nothing.
                </>
              ) : (
                <>
                  Mark the itinerary for <span className="font-bold text-foreground">{row?.tripReference ?? "—"}</span> as
                  sent to <span className="font-bold text-foreground">{row?.client ?? "—"}</span>? This records the act in
                  the trip&apos;s activity trail — it does not deliver an email.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
            <Button type="button" variant="outline" className="gap-1.5 px-5" onClick={closeModal} disabled={isPending}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="button"
              variant={maySend ? "outline" : "default"}
              className="gap-1.5 px-5"
              onClick={handleMark}
              disabled={isPending || !row}
            >
              <Check className="size-4" />
              Mark as Sent
            </Button>
            {maySend && (
              <Button type="button" className="gap-1.5 px-6" onClick={openCompose} disabled={!row}>
                <Mail className="size-4" />
                Email It
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ComposeEmailDialog
        open={Boolean(composeFor)}
        onOpenChange={(next) => !next && setComposeFor(null)}
        context={{ clientId: composeFor?.clientId, tripId: composeFor?.tripId }}
        category="TRIP_CONFIRMATION"
        title="Email the itinerary"
        description="The trip's route, date and aircraft are filled in by the system. Once it is accepted, the itinerary is marked sent."
        // Delivered to nobody (no mail server) is not sent — only a real
        // delivery marks the document.
        onSent={(email) => email?.status === "SENT" && markSent(composeFor?.id)}
      />
    </>
  );
}
