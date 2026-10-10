"use client";

import { useState } from "react";
import { ArrowRight, Check, Mail, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import { useChangeTripStatus } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { isStepBack, moveVerb } from "@/lib/trip";

/**
 * The lifecycle moves this trip can make next — exactly the API's
 * `nextStatuses`, so a button never offers a move that would be refused —
 * and "Email Client" (Email Templates, #21), which opens the shared compose
 * form with this trip's route, date and aircraft filled by the API. The old
 * bar's "Send Operator Message" is not back: an operator email about a trip
 * is sent from the Email Templates screen, which can address one.
 */
export default function TripActionBar({ trip }) {
  const { canAccess } = usePermissions();
  const { mutate: move, isPending } = useChangeTripStatus();
  const [composeOpen, setComposeOpen] = useState(false);

  const mayMove = canAccess(Module.TRIPS, Action.EDIT);
  const maySend = canAccess(Module.EMAIL_TEMPLATES, Action.SEND) && Boolean(trip?.clientId);
  if (trip?.isArchived || (!mayMove && !maySend)) return null;
  const moves = mayMove ? (trip?.nextStatuses ?? []) : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {moves.map((status) => {
          const cancel = status === "CANCELLED";
          const back = isStepBack(trip?.rawStatus, status);
          return (
            <Button
              key={status}
              // Forward is the primary action; undoing a step and cancelling
              // are secondary, so the obvious button is always progress.
              variant={cancel || back ? "outline" : "default"}
              className={`gap-2 px-4 ${cancel ? "text-destructive" : ""}`}
              disabled={isPending}
              onClick={() => move?.({ id: trip?.id, status })}
            >
              {cancel ? <XCircle className="size-3.5" /> : back ? <Undo2 className="size-3.5" /> : <ArrowRight className="size-3.5" />}
              {moveVerb(status, trip?.rawStatus)}
            </Button>
          );
        })}
        {maySend && (
          <Button variant="outline" className="gap-2 px-4" onClick={() => setComposeOpen(true)}>
            <Mail className="size-3.5" />
            Email Client
          </Button>
        )}
      </div>
      {trip?.rawStatus === "COMPLETED" && (
        <p className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-success">
          <Check className="size-3.5" />
          Operation completed
        </p>
      )}

      {maySend && (
        <ComposeEmailDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          context={{ clientId: trip?.clientId, tripId: trip?.id }}
          category="TRIP_CONFIRMATION"
          title="Email the client about this trip"
          description="The route, date and aircraft are filled in from the trip. It is recorded on the trip's and the client's timelines."
        />
      )}
    </div>
  );
}
