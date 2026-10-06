"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import {
  FOLLOW_UP_REMINDER_OPTIONS,
  PAYMENT_REMINDER_OPTIONS,
  QUOTE_EXPIRY_WARNING_OPTIONS,
  announceLocalSave,
} from "@/lib/settings";
import SettingsCard from "../SettingsCard";
import SettingRow from "../SettingRow";
import SettingsSelect from "../SettingsSelect";
import SettingsButton from "../SettingsButton";

/**
 * WhatsApp, weather alerts, the empty-leg email importer and flight alerts to
 * clients are not offered: each waits on an integration that does not exist
 * (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function NotificationsSection() {
  const notifications = useSettingsStore((s) => s.notifications);
  const setField = useSettingsStore((s) => s.setField);
  const set = (key) => setField("notifications", key);

  return (
    <>
      <SettingsCard
        title="Notification channels"
        description="Choose how brokers and administrators receive operational alerts."
      >
        <SettingRow
          label="Email notifications"
          description="Send eligible alerts by email from the CRM's mail account."
          checked={notifications?.emailNotifications}
          onCheckedChange={set("emailNotifications")}
        />
        <SettingRow
          label="In-app notifications"
          description="Show alerts inside the command center notification center."
          checked={notifications?.inAppNotifications}
          onCheckedChange={set("inAppNotifications")}
        />
      </SettingsCard>

      <SettingsCard
        title="Operational automation"
        description="Automations run only when the related data or integration is available."
      >
        <SettingRow
          label="Automatic flight alerts"
          description="Notify assigned brokers when departure, delay or landing status changes."
          checked={notifications?.flightAlertsToBrokers}
          onCheckedChange={set("flightAlertsToBrokers")}
        />
        <SettingRow
          label="Client follow-up reminders"
          description="Create broker reminders from CRM next-follow-up dates."
          checked={notifications?.followUpReminders}
          onCheckedChange={set("followUpReminders")}
        />
        <SettingRow
          label="Payment reminders"
          description="Notify the responsible broker when client or operator payments are due."
          checked={notifications?.paymentReminders}
          onCheckedChange={set("paymentReminders")}
        />
        <SettingRow
          label="Quote expiration reminders"
          description="Warn before a client quote expires."
          checked={notifications?.quoteExpiryReminders}
          onCheckedChange={set("quoteExpiryReminders")}
        />
      </SettingsCard>

      <SettingsCard title="Timing" description="Default timing can be overridden by individual workflows.">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          <SettingsSelect
            label="Quote Expiration Warning"
            value={notifications?.quoteExpiryWarningHours}
            onChange={set("quoteExpiryWarningHours")}
            options={QUOTE_EXPIRY_WARNING_OPTIONS}
          />
          <SettingsSelect
            label="Payment Reminder"
            value={notifications?.paymentReminderDays}
            onChange={set("paymentReminderDays")}
            options={PAYMENT_REMINDER_OPTIONS}
          />
          <SettingsSelect
            label="Follow-up Reminder"
            value={notifications?.followUpReminderMinutes}
            onChange={set("followUpReminderMinutes")}
            options={FOLLOW_UP_REMINDER_OPTIONS}
          />
        </div>
        <SettingsButton primary onClick={() => announceLocalSave("Notification settings")}>
          Save Notification Settings
        </SettingsButton>
      </SettingsCard>
    </>
  );
}
