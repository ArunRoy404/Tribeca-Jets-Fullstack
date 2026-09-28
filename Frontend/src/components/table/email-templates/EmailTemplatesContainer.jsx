"use client";

import { useMemo, useState } from "react";
import { Eye, Mail, Edit2, Power, RotateCcw, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import BulkDeleteDialog from "@/components/common/BulkDeleteDialog";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import EmailTemplatesToolbar from "./EmailTemplatesToolbar";
import EmailTemplatesCardsContainer from "./EmailTemplatesCardsContainer";
import EmailTemplatesTable from "./EmailTemplatesTable";
import SentEmailsTable from "./SentEmailsTable";
import SentEmailsCardsContainer from "./SentEmailsCardsContainer";
import EmailTemplateDetailSheet from "@/components/email-templates/EmailTemplateDetailSheet";
import SentEmailDetailSheet from "@/components/email-templates/SentEmailDetailSheet";
import {
  useEmailTemplates,
  useRemoveEmailTemplate,
  useRestoreEmailTemplate,
  useSentEmails,
  useUpdateEmailTemplate,
} from "@/hooks/email-templates";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { EMAIL_TABS, toEmailTemplate, toSentEmail } from "@/lib/email";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";

/**
 * The Email Templates screen (#21), API-backed: the URL is the state, the
 * server pages. Three tabs — the library, the sent log and the archived
 * library. Anyone on staff reads and uses a template; administrators and
 * senior brokers change the library.
 */
export default function EmailTemplatesContainer({ params, revealDelay = 0 }) {
  const { can, canWrite } = usePermissions();
  const mayManage = canWrite(Permission.MANAGE_EMAIL_TEMPLATES);
  const maySend = canWrite(Permission.SEND_EMAILS);
  const isArchived = params.tab === EMAIL_TABS.ARCHIVED;
  const isSent = params.tab === EMAIL_TABS.SENT && can(Permission.SEND_EMAILS);

  const templatesQuery = useEmailTemplates(params.queryParams, { enabled: !isSent });
  const sentQuery = useSentEmails(params.sentParams, { enabled: isSent });
  const { data, isPending, error, refetch } = isSent ? sentQuery : templatesQuery;

  const templates = useMemo(() => (templatesQuery.data?.data ?? []).map(toEmailTemplate), [templatesQuery.data?.data]);
  const emails = useMemo(() => (sentQuery.data?.data ?? []).map(toSentEmail), [sentQuery.data?.data]);
  const rows = isSent ? emails : templates;
  const meta = data?.meta;
  const isEmpty = !isPending && !error && rows.length === 0;

  const openEditTemplate = useEmailTemplatesStore((s) => s.openEditTemplate);
  const openNewTemplate = useEmailTemplatesStore((s) => s.openNewTemplate);
  const openCompose = useEmailTemplatesStore((s) => s.openCompose);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const { mutate: removeTemplates } = useRemoveEmailTemplate();
  const { mutate: restoreTemplates } = useRestoreEmailTemplate();
  const { mutate: updateTemplate } = useUpdateEmailTemplate();

  const selectedRows = useMemo(() => templates.filter((row) => selected.has(row?.id)), [templates, selected]);
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleBulkAction = () => {
    const ids = selectedRows.map((row) => row?.id).filter(Boolean);
    if (!ids.length) return;
    (isArchived ? restoreTemplates : removeTemplates)(ids, {
      onSuccess: () => {
        setBulkOpen(false);
        setSelected(new Set());
      },
    });
  };

  /** One definition of a row's menu, for the table and the cards alike. */
  const getRowActions = (t) => {
    const view = { label: "View Details", icon: <Eye />, onSelect: () => params.setTemplate(t?.id) };
    if (isArchived) {
      return mayManage
        ? [view, { label: "Restore", icon: <RotateCcw />, onSelect: () => restoreTemplates(t?.id) }]
        : [view];
    }
    const actions = [view];
    if (maySend && t?.active) actions.push({ label: "Use / Send", icon: <Mail />, onSelect: () => openCompose(t?.id) });
    if (mayManage) {
      actions.push({ label: "Edit Template", icon: <Edit2 />, onSelect: () => openEditTemplate(t?.id) });
      actions.push({
        label: t?.active ? "Switch Off" : "Switch On",
        icon: <Power />,
        onSelect: () => updateTemplate({ id: t?.id, active: !t?.active }),
      });
      actions.push("separator");
      actions.push({ label: "Archive", icon: <Trash2 />, variant: "destructive", onSelect: () => removeTemplates(t?.id) });
    }
    return actions;
  };

  const emptyMessage = isSent ? "No emails sent yet" : isArchived ? "Nothing archived" : "No templates match these filters";
  const emptyHint = isSent
    ? params.hasFilters
      ? "Try clearing a filter."
      : "Emails sent from the CRM — from here, a client, a trip, a quote or an invoice — appear here."
    : isArchived
      ? "Archived templates appear here and can be restored."
      : params.hasFilters
        ? "Try clearing a filter."
        : mayManage
          ? "Add a template and it will appear here."
          : "No templates have been added yet.";

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <EmailTemplatesToolbar
          params={params}
          selectedCount={selectedRows.length}
          onBulkAction={() => setBulkOpen(true)}
          onSendEmail={() => openCompose(null)}
          onNewTemplate={openNewTemplate}
          mayManage={mayManage}
          maySend={maySend}
          showSentTab={can(Permission.SEND_EMAILS)}
        />

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={emptyMessage}
            emptyHint={emptyHint}
            onRetry={refetch}
          />
        ) : isSent ? (
          <>
            <SentEmailsCardsContainer emails={emails} onSelectEmail={params.setEmail} />
            <SentEmailsTable emails={emails} onSelectEmail={params.setEmail} />
          </>
        ) : (
          <>
            <EmailTemplatesCardsContainer
              templates={templates}
              selected={selected}
              onToggleRow={toggleRow}
              getRowActions={getRowActions}
              onSelectTemplate={params.setTemplate}
              selectable={mayManage}
              archived={isArchived}
            />
            <EmailTemplatesTable
              pageTemplates={templates}
              selected={selected}
              onToggleRow={toggleRow}
              onSelectAll={() =>
                setSelected((prev) => (prev.size === templates.length ? new Set() : new Set(templates.map((t) => t?.id))))
              }
              onSelectTemplate={params.setTemplate}
              getRowActions={getRowActions}
              selectable={mayManage}
              archived={isArchived}
            />
          </>
        )}

        {!isPending && !error && !isEmpty && (
          <div className="relative w-full">
            <TablePagination
              totalCount={meta?.total ?? 0}
              itemLabel={isSent ? "emails" : "templates"}
              page={meta?.page ?? 1}
              pageCount={meta?.totalPages ?? 1}
              onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
              onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
              onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
            />
          </div>
        )}

        <EmailTemplateDetailSheet templateId={params.template} onClose={() => params.setTemplate("")} />
        <SentEmailDetailSheet emailId={params.email} onClose={() => params.setEmail("")} />

        <BulkDeleteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          items={selectedRows.map((row) => ({ id: row?.id, name: row?.name }))}
          itemLabel="templates"
          action={isArchived ? "restore" : "remove"}
          onConfirm={handleBulkAction}
        />
      </CommonCard>
    </Reveal>
  );
}
