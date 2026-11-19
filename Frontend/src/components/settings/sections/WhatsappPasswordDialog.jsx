"use client";

import { useState } from "react";
import CommonInput from "@/components/common/CommonInput";
import SettingsButton from "@/components/settings/SettingsButton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function WhatsappPasswordDialog({ title, error, pending, onSubmit, onClose }) {
  const [password, setPassword] = useState("");
  const message = error?.fieldErrors?.currentPassword ?? error?.message;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Enter your current password to continue.</DialogDescription>
        <form className="flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (!password || pending) return;
          onSubmit(password);
          setPassword("");
        }}>
          <CommonInput
            name="whatsapp-current-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={message}
            required
          />
          <div className="flex flex-wrap justify-end gap-2">
            <SettingsButton type="button" disabled={pending} onClick={onClose}>Cancel</SettingsButton>
            <SettingsButton primary type="submit" disabled={pending || !password}>
              {pending ? "Working…" : title}
            </SettingsButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
