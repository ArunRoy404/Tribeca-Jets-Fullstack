"use client";

import { Clock } from "lucide-react";
import { useIdleLogout } from "@/hooks/common/useIdleLogout";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Runs the idle timer for the dashboard, and warns before it fires.
 *
 * Rendered once in the dashboard layout rather than per screen: the session is
 * one thing, and a timer per page would reset on every navigation — which is
 * the one event that is *not* evidence someone is there.
 *
 * The warning exists because signing out silently loses whatever was on
 * screen. A minute is enough to finish a sentence in a quote and save it.
 */
export default function IdleLogoutWatcher() {
  const { secondsLeft, staySignedIn, idleTimeoutMinutes } = useIdleLogout();

  const open = secondsLeft !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing the warning any way at all — Escape, the backdrop, the
        // button — is somebody touching the app, which is exactly what the
        // timer is asking about.
        if (!next) staySignedIn();
      }}
    >
      <DialogContent className="sm:max-w-115 p-6 flex flex-col items-start gap-4">
        <div className="flex items-start gap-3 w-full">
          <div className="size-11 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
            <Clock className="size-5" />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
              Still there?
            </DialogTitle>
            <DialogDescription className="font-montserrat text-[13px] text-muted-foreground leading-relaxed">
              You will be signed out in{" "}
              <span className="font-bold text-foreground tabular-nums">
                {secondsLeft ?? 0}s
              </span>
              .
              <span className="block pt-2">
                {idleTimeoutMinutes
                  ? `This CRM signs you out after ${idleTimeoutMinutes} minutes without activity, so an unattended screen cannot be used by whoever walks past it.`
                  : "This CRM signs you out after a period without activity, so an unattended screen cannot be used by whoever walks past it."}
              </span>
            </DialogDescription>
          </div>
        </div>

        <div className="w-full border-t border-border my-1" />

        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            className="h-10 px-5 font-medium text-[13px] gap-2"
            onClick={staySignedIn}
          >
            <Clock className="size-4" />
            I&apos;m still here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
