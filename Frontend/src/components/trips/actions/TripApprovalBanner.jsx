"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { cn } from "@/lib/utils";

/**
 * Says why a trip cannot be confirmed yet (client feedback 2.1): it is
 * waiting for someone with Trips · Approve, or it was declined. A declined
 * trip tells whoever can edit it that saving changes sends it back.
 */
export default function TripApprovalBanner({ trip, className }) {
  const { canAccess } = usePermissions();
  if (trip?.isArchived) return null;

  const mayApprove = canAccess(Module.TRIPS, Action.APPROVE);
  const mayEdit = canAccess(Module.TRIPS, Action.EDIT) && trip?.editable;

  if (trip?.approvalStatus === "PENDING") {
    return (
      <Banner
        tone="warning"
        title="Waiting for approval"
        className={className}
        text={
          mayApprove
            ? "This trip was created by someone without approval rights. Approve or decline it below before it can be confirmed."
            : "This trip cannot be confirmed until it is approved. The approvers have been notified."
        }
      />
    );
  }

  if (trip?.approvalStatus === "REJECTED") {
    return (
      <Banner
        tone="destructive"
        title="Approval declined"
        className={className}
        text={`Reason: ${trip?.rejectionReason || "No reason was given."}`}
        hint={
          mayEdit && !mayApprove
            ? "Edit the trip to make the changes asked for. Saving sends it back for approval."
            : mayApprove
              ? "Approve it below once the changes are made."
              : null
        }
      />
    );
  }

  return null;
}

function Banner({ tone, title, text, hint, className }) {
  const Icon = tone === "warning" ? AlertTriangle : XCircle;
  return (
    <div
      className={cn(
        "p-4 rounded-lg border flex items-start gap-3",
        tone === "warning" ? "bg-warning/10 border-warning/30" : "bg-destructive/5 border-destructive/30",
        className
      )}
    >
      <Icon className={cn("size-5 shrink-0 mt-0.5", tone === "warning" ? "text-warning" : "text-destructive")} />
      <div className="flex flex-col gap-1 min-w-0">
        <h4 className="font-montserrat font-bold text-[13px] text-foreground">{title}</h4>
        <p className="font-montserrat text-[12px] text-foreground/90 leading-relaxed break-words">{text}</p>
        {hint && <p className="font-montserrat text-[12px] text-muted-foreground leading-relaxed">{hint}</p>}
      </div>
    </div>
  );
}
