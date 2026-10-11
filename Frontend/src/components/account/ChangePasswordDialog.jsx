"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import CommonInput from "@/components/common/CommonInput";
import SettingsButton from "@/components/settings/SettingsButton";
import { useChangePassword } from "@/hooks/auth";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Change your own password while signed in. Used by My Account and by
 * Settings › Security — one dialog, two buttons that open it.
 */
export default function ChangePasswordDialog({ open, onOpenChange }) {
  const [form, setForm] = useState(EMPTY);
  const close = () => {
    setForm(EMPTY);
    onOpenChange?.(false);
  };
  const { mutate, isPending, error } = useChangePassword({ onDone: close });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const fieldErrors = error?.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange?.(true) : close())}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-5">
        <div className="flex flex-col gap-1.5">
          <DialogTitle className="font-montserrat font-semibold text-[18px] text-foreground">Change password</DialogTitle>
          <DialogDescription className="font-montserrat text-[12px] text-muted-foreground">
            At least 10 characters, with an uppercase letter, a lowercase letter and a number. Every other
            device is signed out; this one stays signed in.
          </DialogDescription>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutate(form);
          }}
        >
          <CommonInput
            type="password"
            name="current-password"
            label="Current Password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
            error={fieldErrors.currentPassword}
            required
          />
          <CommonInput
            type="password"
            name="new-password"
            label="New Password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set("newPassword")}
            error={fieldErrors.newPassword}
            required
          />
          <CommonInput
            type="password"
            name="confirm-password"
            label="Confirm New Password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            error={fieldErrors.confirmPassword}
            required
          />
          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <SettingsButton type="button" onClick={close} disabled={isPending}>
              Cancel
            </SettingsButton>
            <SettingsButton primary type="submit" disabled={isPending}>
              {isPending ? "Changing…" : "Change Password"}
            </SettingsButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
