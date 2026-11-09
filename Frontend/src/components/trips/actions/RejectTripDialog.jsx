"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Rejection reason dialog when an administrator declines trip approval
 * (Batch 4 - CRM Feedback 2.1).
 */
export default function RejectTripDialog({
  open,
  onOpenChange,
  trip,
  onConfirm,
  isPending = false,
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm?.({ reason: reason.trim() });
    setReason("");
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Decline Trip Approval</DialogTitle>
          <DialogDescription>
            Are you sure you want to decline approval for trip <strong>{trip?.reference}</strong>?
            The assigned broker will be notified via email and task.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-3">
          <label className="text-xs font-semibold text-muted-foreground">
            Reason for Rejection (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Please verify operator contract rate and leg timing before resubmitting."
            className="w-full min-h-[90px] rounded-md border border-border bg-input/50 p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-purple resize-none"
            rows={3}
            maxLength={1000}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Declining..." : "Decline Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
