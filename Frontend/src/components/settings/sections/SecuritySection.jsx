"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { IDLE_TIMEOUT_OPTIONS, IDLE_WARNING_OPTIONS, announceLocalSave } from "@/lib/settings";
import { toastInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";
import SettingsPill from "../SettingsPill";

const SESSION_COLUMNS = ["Device / Browser", "Last Active", "Status", "Action"];

/**
 * Left out of the design, each for its own reason (MODULE_FEATURE_STATUS.md,
 * Settings): the session "Location" column (needs a paid IP-lookup service),
 * new-device alerts and trusted devices (features nobody asked for), and the
 * "Audit & deletion safeguards" toggles (always on — not a preference).
 */
export default function SecuritySection() {
  const security = useSettingsStore((s) => s.security);
  const sessions = useSettingsStore((s) => s.sessions);
  const setField = useSettingsStore((s) => s.setField);
  const revokeSession = useSettingsStore((s) => s.revokeSession);
  const set = (key) => setField("security", key);

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
            options={IDLE_TIMEOUT_OPTIONS}
          />
          <SettingsSelect
            label="Warning Before Logout"
            value={security?.idleWarningMinutes}
            onChange={set("idleWarningMinutes")}
            options={IDLE_WARNING_OPTIONS}
          />
        </div>
        <SettingRow
          label="Show inactivity warning"
          description="Display a “Stay Signed In” warning before the session expires."
          checked={security?.showIdleWarning}
          onCheckedChange={set("showIdleWarning")}
        />
      </SettingsCard>

      <SettingsCard title="Authentication" description="Protect sign-in and sensitive administrative actions.">
        <SettingRow
          label="Two-factor authentication"
          description="Require a second verification step for administrative accounts."
          checked={security?.requireAdminTwoFactor}
          onCheckedChange={set("requireAdminTwoFactor")}
        />
        <div className="flex flex-wrap gap-2.5">
          <SettingsButton
            onClick={() =>
              toastInfo("Password change isn't connected yet", "It arrives with the Settings API.")
            }
          >
            Change Password
          </SettingsButton>
          <SettingsButton primary onClick={() => announceLocalSave("Security settings")}>
            Save Security Settings
          </SettingsButton>
        </div>
      </SettingsCard>

      <SettingsCard title="Active sessions" description="Review signed-in devices and revoke access when needed.">
        <div className="hidden sm:flex gap-3 w-full font-montserrat font-medium text-[12px] leading-normal text-muted-foreground">
          {SESSION_COLUMNS.map((column) => (
            <p key={column} className="flex-1 min-w-0">
              {column}
            </p>
          ))}
        </div>
        {sessions?.length ? (
          sessions.map((session) => (
            <div
              key={session?.id}
              className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 w-full font-montserrat text-[13px] leading-normal text-foreground"
            >
              <p className="w-full sm:w-auto sm:flex-1 min-w-0 font-medium sm:font-normal">{session?.device}</p>
              <p className="sm:flex-1 min-w-0 text-muted-foreground sm:text-foreground">{session?.lastActive}</p>
              <p className={cn("flex-1 min-w-0 text-success", session?.current && "font-medium")}>
                {session?.current ? "Current session" : "Active"}
              </p>
              <div className="sm:flex-1 min-w-0">
                <SettingsButton onClick={() => revokeSession(session?.id)} disabled={session?.current}>
                  Revoke
                </SettingsButton>
              </div>
            </div>
          ))
        ) : (
          <p className="font-montserrat text-[13px] text-muted-foreground">No other signed-in devices.</p>
        )}
        <SettingsPill tone="warning">Sample sessions — the session list arrives with the Settings API</SettingsPill>
      </SettingsCard>
    </>
  );
}
