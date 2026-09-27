"use client";

import { ArrowRight, Check, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChangeTripStatus } from "@/hooks/trips";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { isStepBack, moveVerb } from "@/lib/trip";

/**
 * The lifecycle moves this trip can make next — exactly the API's
 * `nextStatuses`, so a button never offers a move that would be refused.
 * The old bar's "Send Client Update" and "Send Operator Message" did nothing;
 * messaging is Email Templates (#21), and a button that sends nothing is gone.
 */
export default function TripActionBar({ trip }) {
  const { canWrite } = usePermissions();
  const { mutate: move, isPending } = useChangeTripStatus();

  if (trip?.isArchived || !canWrite(Permission.MANAGE_TRIPS)) return null;
  const moves = trip?.nextStatuses ?? [];

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
      </div>
      {trip?.rawStatus === "COMPLETED" && (
        <p className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-success">
          <Check className="size-3.5" />
          Operation completed
        </p>
      )}
    </div>
  );
}
