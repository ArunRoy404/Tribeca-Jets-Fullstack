"use client";

import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, Mail, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import RejectTripDialog from "@/components/trips/actions/RejectTripDialog";
import { useApproveTrip, useChangeTripStatus, useRejectTrip } from "@/hooks/trips";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useBookingConfirmationStore } from "@/store/useBookingConfirmationStore";
import { Action, Module } from "@/lib/access";
import { isAdministratorRole } from "@/lib/roles";
import { isStepBack, moveVerb } from "@/lib/trip";

/**
 * The lifecycle moves this trip can make next — exactly the API's
 * `nextStatuses`, so a button never offers a move that would be refused —
 * and "Email Client" (Email Templates, #21), which opens the shared compose
 * form with this trip's route, date and aircraft filled by the API.
 *
 * For trips pending administrator approval, administrators are presented
 * with "Approve Trip" and "Decline Approval" (Batch 4 - CRM Feedback 2.1).
 */
export default function TripActionBar({ trip }) {
  const { data: currentUser } = useCurrentUser();
  const { canAccess } = usePermissions();
  const { mutate: move, isPending: isMovePending } = useChangeTripStatus();
  const { mutate: approve, isPending: isApprovePending } = useApproveTrip();
  const { mutate: reject, isPending: isRejectPending } = useRejectTrip();

  const [composeOpen, setComposeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const openBookingModal = useBookingConfirmationStore((s) => s.openModal);

  const isAdmin = isAdministratorRole(currentUser?.role);
  const isPendingApproval = trip?.approvalStatus === "PENDING";
  const isPending = isMovePending || isApprovePending || isRejectPending;

  const mayMove = canAccess(Module.TRIPS, Action.EDIT);
  const maySend = canAccess(Module.EMAIL_TEMPLATES, Action.SEND) && Boolean(trip?.clientId);
  if (trip?.isArchived || (!mayMove && !maySend)) return null;
  const moves = mayMove ? (trip?.nextStatuses ?? []) : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Administrator Approval Actions (Batch 4 - CRM Feedback 2.1) */}
        {isAdmin && isPendingApproval && (
          <div className="flex items-center gap-2 mr-2 border-r border-border pr-3">
            <Button
              variant="default"
              className="gap-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPending}
              onClick={() => approve(trip?.id)}
            >
              <CheckCircle2 className="size-3.5" />
              {isApprovePending ? "Approving..." : "Approve Trip"}
            </Button>
            <Button
              variant="outline"
              className="gap-2 px-4 text-destructive hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="size-3.5" />
              Decline Approval
            </Button>
          </div>
        )}

        {moves.map((status) => {
          const cancel = status === "CANCELLED";
          const back = isStepBack(trip?.rawStatus, status);
          const isConfirm = status === "CONFIRMED";
          const hasOperator = Boolean(trip?.operatorId || (trip?.operator && trip.operator !== "—"));
          const hasDate = Boolean(trip?.rawDepartureDate || (trip?.departureDate && trip.departureDate !== "—"));
          const hasPax = (trip?.passengerCount != null && trip.passengerCount > 0) || (trip?.passengers?.length > 0);
          const confirmBlocked = isConfirm && (!hasOperator || !hasDate || !hasPax || isPendingApproval);
          const tooltip = confirmBlocked
            ? isPendingApproval
              ? "Trip requires administrator approval before it can be confirmed"
              : "Confirming requires an assigned operator, departure date, and passengers"
            : undefined;

          return (
            <Button
              key={status}
              // Forward is the primary action; undoing a step and cancelling
              // are secondary, so the obvious button is always progress.
              variant={cancel || back ? "outline" : "default"}
              className={`gap-2 px-4 ${cancel ? "text-destructive" : ""}`}
              disabled={isPending || confirmBlocked}
              title={tooltip}
              onClick={() =>
                move?.(
                  { id: trip?.id, status },
                  {
                    onSuccess: (updated) => {
                      if (status === "BOOKED") {
                        openBookingModal(updated || trip);
                      }
                    },
                  }
                )
              }
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

      {isAdmin && (
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
