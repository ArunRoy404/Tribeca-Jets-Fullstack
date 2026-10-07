"use client";

import { useState } from "react";
import { useSettingsSection } from "@/hooks/settings";
import { IDLE_TIMEOUT_OPTIONS, IDLE_WARNING_OPTIONS } from "@/lib/settings";
import ChangePasswordDialog from "@/components/account/ChangePasswordDialog";
import SessionsList from "@/components/account/SessionsList";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";
import SettingsSectionStatus from "../SettingsSectionStatus";

/**
 * Left out of the design, each for its own reason (MODULE_FEATURE_STATUS.md,
 * Settings): the session "Location" column (needs a paid IP-lookup service),
 * new-device alerts and trusted devices (features nobody asked for), and the
 * "Audit & deletion safeguards" toggles (always on — not a preference).
 */
export default function SecuritySection() {
  const {
    values: security,
    set,
    save,
    isDirty,
    isSaving,
    canEdit,
    isPending,
    error,
    refetch,
  } = useSettingsSection("security");
  const [changingPassword, setChangingPassword] = useState(false);

  if (isPending || error) return <SettingsSectionStatus isPending={isPending} error={error} onRetry={refetch} />;

  return (
    <>
      <SettingsCard title="Session security" description="Automatic session controls requested for CRM security.">
        {/* Always on — the server refuses an idle session's refresh, so a
            switch here could only lie. The pill says so instead. */}
        <SettingRow
          label="Automatic logout after inactivity"
          description="Sign the user out when the CRM has not been touched for the configured duration."
          pill="Required"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsSelect
            label="Inactivity Timeout"
            value={security?.idleTimeoutMinutes}
            onChange={set("idleTimeoutMinutes")}
            disabled={!canEdit}
            options={IDLE_TIMEOUT_OPTIONS}
          />
          <SettingsSelect
            label="Warning Before Logout"
            value={security?.idleWarningMinutes}
            onChange={set("idleWarningMinutes")}
            disabled={!canEdit}
            options={IDLE_WARNING_OPTIONS}
          />
        </div>
        <SettingRow
          label="Show inactivity warning"
          description="Display a “Stay Signed In” warning before the session expires."
          checked={security?.showIdleWarning}
          onCheckedChange={set("showIdleWarning")}
          disabled={!canEdit}
        />
      </SettingsCard>

      <SettingsCard title="Authentication" description="Protect sign-in and sensitive administrative actions.">
        <SettingRow
          label="Require two-factor for administrators"
          description="Every administrator account must enter an emailed code at sign-in. Your own two-factor is on My Account."
          checked={security?.requireAdminTwoFactor}
          onCheckedChange={set("requireAdminTwoFactor")}
          disabled={!canEdit}
        />
        <div className="flex flex-wrap gap-2.5">
          <SettingsButton onClick={() => setChangingPassword(true)}>Change Password</SettingsButton>
          {canEdit ? (
            <SettingsButton primary disabled={!isDirty || isSaving} onClick={save}>
              {isSaving ? "Saving…" : "Save Security Settings"}
            </SettingsButton>
          ) : null}
        </div>
      </SettingsCard>

      <SettingsCard title="Active sessions" description="Review signed-in devices and revoke access when needed.">
        <SessionsList />
      </SettingsCard>

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </>
  );
}
