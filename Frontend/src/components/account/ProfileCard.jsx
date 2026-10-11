"use client";

import { useState } from "react";
import CommonInput from "@/components/common/CommonInput";
import FileUpload from "@/components/common/FileUpload";
import UserAvatar from "@/components/common/UserAvatar";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingsButton from "@/components/settings/SettingsButton";
import { useUpdateProfile } from "@/hooks/auth";
import { uploadUrl } from "@/services/uploads.service";
import { formatUserRole, getFullName } from "@/lib/user";
import { optionalText } from "@/lib/form";

/**
 * Your own name, phone and photo. Email and role are shown, not edited —
 * the email is the sign-in identity, and a role is an administrator's call.
 * Mounted with `key={user.id}` so the draft starts from the loaded profile.
 */
export default function ProfileCard({ user }) {
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    avatarUrl: user?.avatarUrl ?? null,
  });
  const { mutate, isPending, error } = useUpdateProfile();
  const fieldErrors = error?.fieldErrors ?? {};
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // A legacy signed URL is not an upload URL; only send the photo when it changed.
  const avatarChanged = form.avatarUrl !== (user?.avatarUrl ?? null);

  return (
    <SettingsCard title="Profile" description="How you appear to the team and on the documents you send.">
      <form
        className="flex flex-col gap-4 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          mutate({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: optionalText(form.phone, { editing: true }),
            ...(avatarChanged ? { avatarUrl: form.avatarUrl } : {}),
          });
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <UserAvatar
            src={uploadUrl(form.avatarUrl)}
            name={getFullName({ firstName: form.firstName, lastName: form.lastName })}
            className="size-16 text-[18px]"
          />
          <div className="flex flex-wrap items-start gap-2.5">
            <FileUpload
              kind="image"
              visibility="PUBLIC"
              accept="image/png,image/jpeg,image/webp"
              buttonLabel={form.avatarUrl ? "Change Photo" : "Upload Photo"}
              onUploaded={(data) => setForm((prev) => ({ ...prev, avatarUrl: data?.url ?? null }))}
              className="[&_[data-slot=button]]:h-auto [&_[data-slot=button]]:py-2.5 [&_[data-slot=button]]:text-[14px]"
            />
            {form.avatarUrl && (
              <SettingsButton type="button" onClick={() => setForm((prev) => ({ ...prev, avatarUrl: null }))}>
                Remove Photo
              </SettingsButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <CommonInput
            name="account-first-name"
            label="First Name"
            value={form.firstName}
            onChange={set("firstName")}
            error={fieldErrors.firstName}
            required
          />
          <CommonInput
            name="account-last-name"
            label="Last Name"
            value={form.lastName}
            onChange={set("lastName")}
            error={fieldErrors.lastName}
            required
          />
          <CommonInput name="account-email" type="email" label="Email" value={user?.email ?? ""} disabled />
          <CommonInput
            name="account-phone"
            type="tel"
            label="Phone (Optional)"
            placeholder="+1 (000) 000-0000"
            value={form.phone}
            onChange={set("phone")}
            error={fieldErrors.phone}
          />
          <CommonInput name="account-role" label="Role" value={formatUserRole(user?.role)} disabled />
        </div>

        <SettingsButton primary type="submit" className="self-start" disabled={isPending}>
          {isPending ? "Saving…" : "Save Profile"}
        </SettingsButton>
      </form>
    </SettingsCard>
  );
}
