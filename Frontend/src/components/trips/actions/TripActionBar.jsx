"use client";

import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, Mail, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import RejectTripDialog from "@/components/trips/actions/RejectTripDialog";
import { useApproveTrip, useChangeTripStatus, useRejectTrip, useTripOpenItems } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatMoneyExact } from "@/lib/money";
import { Action, Module } from "@/lib/access";
import { isStepBack, moveVerb } from "@/lib/trip";

/**
 * The lifecycle moves this trip can make next — exactly the API's
 * `nextStatuses`, so a button never offers a move that would be refused —
 * and "Email Client" (Email Templates, #21), which opens the shared compose
 * form with this trip's route, date and aircraft filled by the API.
 *
 * A trip waiting for approval offers "Approve Trip" and "Decline Approval"
 * to whoever holds Trips · Approve (client feedback 2.1); a declined trip
 * offers Approve only. Neither can be confirmed until it is approved.
 */
export default function TripActionBar({ trip }) {
  const { canAccess } = usePermissions();
  const { mutate: move, isPending: isMovePending } = useChangeTripStatus();
  const { mutate: approve, isPending: isApprovePending } = useApproveTrip();
  const { mutate: reject, isPending: isRejectPending } = useRejectTrip();

  const [composeOpen, setComposeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const openItems = useTripOpenItems();
  const [completeWarning, setCompleteWarning] = useState(null);
  const missing = [
    !(trip?.raw?.operatorId) && "assign an operator",
    !(trip?.raw?.departureDate || trip?.raw?.legs?.[0]?.departureDate) && "add a departure date",
    (!(trip?.passengerCount > 0) && !trip?.passengers?.length) && "add passengers",
    !trip?.operatorConfirmed && "tick Operator confirmed",
    !trip?.raw?.legs?.[0]?.departureTime && "add a departure time",
  ].filter(Boolean);
  const changeStatus = async (status) => {
    try {
      if (status === "COMPLETED") {
        const items = await openItems.mutateAsync(trip.id);
        const warnings = [
          items.operatorUnpaid && `Operator not fully paid${items.operatorBalance == null ? "" : ` (${formatMoneyExact(items.operatorBalance)})`}`,
          items.uninvoicedOpen && `${items.uninvoiced == null ? "Part of the trip" : formatMoneyExact(items.uninvoiced)} not yet invoiced`,
        ].filter(Boolean);
        if (warnings.length) { setCompleteWarning(warnings.join(" · ")); return; }
      }
      move({ id: trip.id, status });
    } catch { /* The read hook reports the error; retain the action for retry. */ }
  };

  const mayApprove = canAccess(Module.TRIPS, Action.APPROVE);
  const isPendingApproval = trip?.approvalStatus === "PENDING";
  const isDeclined = trip?.approvalStatus === "REJECTED";
  const awaitingApproval = isPendingApproval || isDeclined;
  const isPending = isMovePending || isApprovePending || isRejectPending || openItems.isPending;

  const mayMove = canAccess(Module.TRIPS, Action.EDIT);
  const maySend = canAccess(Module.EMAIL_TEMPLATES, Action.SEND) && Boolean(trip?.clientId);
  const offersApproval = mayApprove && awaitingApproval;
  if (trip?.isArchived || (!mayMove && !maySend && !offersApproval)) return null;
  const moves = mayMove ? (trip?.nextStatuses ?? []) : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Trips · Approve (client feedback 2.1) */}
        {offersApproval && (
          <div className="flex flex-wrap items-center gap-2 mr-2 sm:border-r border-border sm:pr-3">
            <Button
              variant="default"
              className="gap-2 px-4 bg-success hover:bg-success/90 text-white"
              disabled={isPending}
              onClick={() => approve(trip?.id)}
            >
              <CheckCircle2 className="size-3.5" />
              {isApprovePending ? "Approving..." : "Approve Trip"}
            </Button>
            {isPendingApproval && (
              <Button
                variant="outline"
                className="gap-2 px-4 text-destructive hover:bg-destructive/10"
                disabled={isPending}
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="size-3.5" />
                Decline Approval
              </Button>
            )}
          </div>
        )}

        {moves.map((status) => {
          const cancel = status === "CANCELLED";
          const back = isStepBack(trip?.rawStatus, status);
          const isConfirm = status === "CONFIRMED";
          const confirmBlocked = isConfirm && (missing.length > 0 || awaitingApproval);
          const tooltip = confirmBlocked ? (awaitingApproval ? "This trip must be approved before confirming" : `Before confirming: ${missing.join(", ")}`) : undefined;

          return (
            <Button
              key={status}
              // Forward is the primary action; undoing a step and cancelling
              // are secondary, so the obvious button is always progress.
              variant={cancel || back ? "outline" : "default"}
              className={`gap-2 px-4 ${cancel ? "text-destructive" : ""}`}
              disabled={isPending || confirmBlocked}
              title={tooltip}
              onClick={() => changeStatus(status)}
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
      {trip?.rawStatus !== "COMPLETED" && trip?.clientBilling?.rawState && trip.clientBilling.rawState !== "PAID" && (
        <p className="font-montserrat text-[11px] text-amber-600 font-medium">
          Client statement: {trip.clientBilling.state}
        </p>
      )}

      {moves.includes("CONFIRMED") && missing.length > 0 && (
        <p className="w-full font-montserrat text-[12px] text-warning">Before confirming: {missing.join(", ")}</p>
      )}
      <ConfirmDialog open={Boolean(completeWarning)} onOpenChange={(open) => !open && setCompleteWarning(null)}
        title="Complete this trip anyway?" description={completeWarning} confirmLabel="Complete Anyway" pending={isMovePending}
        onConfirm={() => move({ id: trip.id, status: "COMPLETED" }, { onSuccess: () => setCompleteWarning(null) })} />
      {mayApprove && (
        <RejectTripDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          trip={trip}
          isPending={isRejectPending}
          onConfirm={({ reason }) => reject({ id: trip?.id, reason })}
        />
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
