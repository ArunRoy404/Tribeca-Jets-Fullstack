"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import EmailTemplatesContainer from "@/components/table/email-templates/EmailTemplatesContainer";
import NewEmailTemplateDialog from "@/components/email-templates/NewEmailTemplateDialog";
import ComposeEmailDialog from "@/components/common/email/ComposeEmailDialog";
import { useEmailTemplateStats, useEmailTemplatesTableParams } from "@/hooks/email-templates";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toISODate } from "@/lib/date";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";

const DASH = "—";

/**
 * Email Templates (#21). The tiles are the API's: "Categories" is how many
 * the library actually uses, and "Sent this month" counts emails a mail
 * server accepted — shown only to a role that may see the sent log.
 */
export default function EmailTemplatesPage() {
  const params = useEmailTemplatesTableParams();
  const { can } = usePermissions();
  const { data: stats } = useEmailTemplateStats({ on: toISODate(new Date()) });
  const composeOpen = useEmailTemplatesStore((s) => s.composeOpen);
  const composeTemplateId = useEmailTemplatesStore((s) => s.composeTemplateId);
  const closeCompose = useEmailTemplatesStore((s) => s.closeCompose);

  const tiles = [
    { label: "TOTAL TEMPLATES", value: stats?.total ?? DASH, tone: "foreground" },
    { label: "ACTIVE", value: stats?.active ?? DASH, tone: "success" },
    { label: "CATEGORIES IN USE", value: stats?.categoriesInUse ?? DASH, tone: "purple" },
    ...(can(Permission.SEND_EMAILS)
      ? [{ label: "SENT THIS MONTH", value: stats?.sentThisMonth ?? DASH, tone: "foreground" }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={tiles} gridClassName="grid grid-cols-2 lg:grid-cols-4" />
      <EmailTemplatesContainer params={params} />

      <NewEmailTemplateDialog />
      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={(open) => !open && closeCompose()}
        templateId={composeTemplateId}
      />
    </div>
  );
}
