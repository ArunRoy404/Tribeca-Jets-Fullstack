"use client";

import { useState } from "react";
import { Mail, Edit2, Copy, Check, Power, RotateCcw, Trash2 } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Button } from "@/components/ui/button";
import {
  useEmailTemplate,
  useMergeFields,
  useRemoveEmailTemplate,
  useRestoreEmailTemplate,
  useUpdateEmailTemplate,
} from "@/hooks/email-templates";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toEmailTemplate } from "@/lib/email";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";

/**
 * One template. The merge fields are the API's catalogue, listed once with
 * what fills each. Editing and archiving are for the roles that manage the
 * library; "Use Template" for anyone who may send. An archived template
 * offers Restore and nothing else.
 */
export default function EmailTemplateDetailSheet({ templateId, onClose }) {
  const { data } = useEmailTemplate(templateId);
  const { data: fields } = useMergeFields();
  const { canWrite } = usePermissions();
  const mayManage = canWrite(Permission.MANAGE_EMAIL_TEMPLATES);
  const maySend = canWrite(Permission.SEND_EMAILS);
  const openEditTemplate = useEmailTemplatesStore((s) => s.openEditTemplate);
  const openCompose = useEmailTemplatesStore((s) => s.openCompose);
  const { mutate: update } = useUpdateEmailTemplate();
  const { mutate: remove } = useRemoveEmailTemplate();
  const { mutate: restore, isPending: restoring } = useRestoreEmailTemplate();
  const [copied, setCopied] = useState(false);

  const template = data ? toEmailTemplate(data) : null;
  const used = new Set(`${template?.subject ?? ""} ${template?.body ?? ""}`.match(/\{[a-z][a-z0-9_]*\}/g) ?? []);

  const handleCopy = () => {
    if (!template) return;
    navigator.clipboard?.writeText(template.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DetailSheet
      open={Boolean(templateId) && Boolean(template)}
      onOpenChange={(open) => !open && onClose?.()}
      resetKey={templateId}
      maxWidthClassName="sm:data-[side=right]:max-w-xl"
      bodyClassName="gap-6"
    >
      {template && (
        <>
          <div className="border-b border-secondary flex flex-col gap-2 items-start pb-4 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-montserrat font-bold text-[20px] text-black-text">{template.name}</p>
              <StatusBadge status={template.categoryLabel} bordered />
              {template.isArchived ? (
                <StatusBadge status="Archived" bordered />
              ) : (
                <StatusBadge status={template.status} bordered />
              )}
              {template.isRestored && <RestoredBadge at={template.restoredAtLabel} by={template.restoredByName} />}
            </div>
            <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
              Last updated {template.lastUpdated} by {template.updatedBy}
            </p>
            {template.isArchived && (
              <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                Archived {template.deletedAtLabel} by {template.deletedByName}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Subject</p>
            <div className="bg-secondary/40 border border-border rounded-md p-3">
              <p className="font-montserrat font-semibold text-[13px] text-foreground">{template.subject}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Body</p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-montserrat text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy Body"}
              </button>
            </div>
            <div className="bg-secondary/30 border border-border rounded-md p-4">
              <pre className="font-montserrat font-normal text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
                {template.body}
              </pre>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Merge fields</p>
            <p className="font-montserrat text-[12px] text-muted-foreground">
              Filled from the client, operator, trip, quote or invoice the email is about. The ones this template uses
              are highlighted.
            </p>
            <div className="flex flex-wrap gap-2">
              {(fields ?? []).map((field) => (
                <span
                  key={field.key}
                  title={`${field.label} — ${field.description}`}
                  className={
                    used.has(`{${field.key}}`)
                      ? "font-montserrat text-[12px] font-medium text-purple bg-purple/10 border border-purple/20 px-2.5 py-1 rounded-sm"
                      : "font-montserrat text-[12px] font-medium text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-sm"
                  }
                >
                  {`{${field.key}}`}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-secondary w-full mt-auto">
            {template.isArchived ? (
              mayManage && (
                <Button className="flex-1 px-4 gap-2 h-10 font-medium text-[13px]" onClick={() => restore(template.id)} disabled={restoring}>
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
              )
            ) : (
              <>
                {mayManage && (
                  <Button className="flex-1 px-4 gap-2 h-10 font-medium text-[13px]" onClick={() => openEditTemplate(template.id)}>
                    <Edit2 className="size-3.5" />
                    Edit Template
                  </Button>
                )}
                {maySend && template.active && (
                  <Button
                    variant="outline"
                    className="flex-1 px-4 gap-2 h-10 font-medium text-[13px]"
                    onClick={() => {
                      onClose?.();
                      openCompose(template.id);
                    }}
                  >
                    <Mail className="size-3.5" />
                    Use Template
                  </Button>
                )}
                {mayManage && (
                  <Button
                    variant="outline"
                    className="px-4 gap-2 h-10 font-medium text-[13px]"
                    onClick={() => update({ id: template.id, active: !template.active })}
                  >
                    <Power className="size-3.5" />
                    {template.active ? "Switch Off" : "Switch On"}
                  </Button>
                )}
                {mayManage && (
                  <Button
                    variant="outline"
                    className="px-4 gap-2 h-10 font-medium text-[13px] border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => remove(template.id, { onSuccess: () => onClose?.() })}
                  >
                    <Trash2 className="size-3.5" />
                    Archive
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </DetailSheet>
  );
}
