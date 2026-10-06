"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import CommonInput from "@/components/common/CommonInput";
import SettingsButton from "@/components/settings/SettingsButton";
import { useSetTwoFactor } from "@/hooks/auth";

/** Confirms the password before turning the user's own two-factor on or off. */
export default function TwoFactorDialog({ open, onOpenChange, enable }) {
  const [password, setPassword] = useState("");
  const close = () => {
    setPassword("");
    onOpenChange?.(false);
  };
  const { mutate, isPending, error } = useSetTwoFactor({ onDone: close });

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange?.(true) : close())}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-5">
        <div className="flex flex-col gap-1.5">
          <DialogTitle className="font-montserrat font-semibold text-[18px] text-foreground">
            {enable ? "Turn on two-factor" : "Turn off two-factor"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[12px] text-muted-foreground">
            {enable
              ? "Each sign-in will also ask for a 6-digit code sent to your email."
              : "Signing in will need only your password."}{" "}
            Enter your password to confirm.
          </DialogDescription>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutate({ enabled: enable, currentPassword: password });
          }}
        >
          <CommonInput
            type="password"
            name="two-factor-password"
            label="Current Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error?.fieldErrors?.currentPassword}
            required
          />
          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <SettingsButton type="button" onClick={close} disabled={isPending}>
              Cancel
            </SettingsButton>
            <SettingsButton primary type="submit" disabled={isPending}>
              {isPending ? "Saving…" : enable ? "Turn On" : "Turn Off"}
            </SettingsButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
