"use client";

import { useSettingsSection } from "@/hooks/settings";
import {
  FOLLOW_UP_REMINDER_OPTIONS,
  PAYMENT_REMINDER_OPTIONS,
  QUOTE_EXPIRY_WARNING_OPTIONS,
} from "@/lib/settings";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";
import SettingsSectionStatus from "../SettingsSectionStatus";

/**
 * WhatsApp, weather alerts, the empty-leg email importer and flight alerts to
 * clients are not offered: each waits on an integration that does not exist
 * (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function NotificationsSection() {
  const {
    values: notifications,
    set,
    save,
    isDirty,
    isSaving,
    canEdit,
    isPending,
    error,
    refetch,
  } = useSettingsSection("notifications");

  if (isPending || error) return <SettingsSectionStatus isPending={isPending} error={error} onRetry={refetch} />;

  return (
    <>
      <SettingsCard
        title="Notification channels"
        description="How brokers and administrators receive operational alerts. Saved now — nothing is sent until the alerts below are built."
      >
        <SettingRow
          label="Email notifications"
          description="Send eligible alerts by email from the CRM's mail account."
          checked={notifications?.emailNotifications}
          onCheckedChange={set("emailNotifications")}
          disabled={!canEdit}
        />
        <SettingRow
          label="In-app notifications"
          description="Show alerts inside the command center notification center."
          checked={notifications?.inAppNotifications}
          onCheckedChange={set("inAppNotifications")}
          disabled={!canEdit}
        />
      </SettingsCard>

      <SettingsCard
        title="Operational automation"
        description="Saved now. Each alert starts once it is built; until then none of these sends anything."
      >
        <SettingRow
          label="Automatic flight alerts"
          description="Notify assigned brokers when departure, delay or landing status changes."
          checked={notifications?.flightAlertsToBrokers}
          onCheckedChange={set("flightAlertsToBrokers")}
          disabled={!canEdit}
        />
        <SettingRow
          label="Client follow-up reminders"
          description="Create broker reminders from CRM next-follow-up dates."
          checked={notifications?.followUpReminders}
          onCheckedChange={set("followUpReminders")}
          disabled={!canEdit}
        />
        <SettingRow
          label="Payment reminders"
          description="Notify the responsible broker when client or operator payments are due."
          checked={notifications?.paymentReminders}
          onCheckedChange={set("paymentReminders")}
          disabled={!canEdit}
        />
        <SettingRow
          label="Quote expiration reminders"
          description="Warn before a client quote expires."
          checked={notifications?.quoteExpiryReminders}
          onCheckedChange={set("quoteExpiryReminders")}
          disabled={!canEdit}
        />
      </SettingsCard>

      <SettingsCard title="Timing" description="Default timing can be overridden by individual workflows.">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          <SettingsSelect
            label="Quote Expiration Warning"
            value={notifications?.quoteExpiryWarningHours}
            onChange={set("quoteExpiryWarningHours")}
            disabled={!canEdit}
            options={QUOTE_EXPIRY_WARNING_OPTIONS}
          />
          <SettingsSelect
            label="Payment Reminder"
            value={notifications?.paymentReminderDays}
            onChange={set("paymentReminderDays")}
            disabled={!canEdit}
            options={PAYMENT_REMINDER_OPTIONS}
          />
          <SettingsSelect
            label="Follow-up Reminder"
            value={notifications?.followUpReminderMinutes}
            onChange={set("followUpReminderMinutes")}
            disabled={!canEdit}
            options={FOLLOW_UP_REMINDER_OPTIONS}
          />
        </div>
        {canEdit ? (
          <SettingsButton primary disabled={!isDirty || isSaving} onClick={save}>
            {isSaving ? "Saving…" : "Save Notification Settings"}
          </SettingsButton>
        ) : null}
      </SettingsCard>
    </>
  );
}
