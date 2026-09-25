"use client";

import { Mail, Edit2, Copy, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";
import DetailSheet from "@/components/common/DetailSheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";

const AVAILABLE_VARIABLES = [
  "{client_name}",
  "{trip_id}",
  "{route}",
  "{departure_date}",
  "{aircraft}",
  "{total_price}",
  "{invoice_id}",
  "{agent_name}",
  "{tail_number}",
];

export default function EmailTemplateDetailSheet() {
  const selectedTemplateId = useEmailTemplatesStore((s) => s.selectedTemplateId);
  const closeTemplateDetail = useEmailTemplatesStore((s) => s.closeTemplateDetail);
  const getTemplateById = useEmailTemplatesStore((s) => s.getTemplateById);
  const openNewTemplate = useEmailTemplatesStore((s) => s.openNewTemplate);
  const openDeleteTemplate = useEmailTemplatesStore((s) => s.openDeleteTemplate);
  const openSendEmail = useEmailTemplatesStore((s) => s.openSendEmail);

  const [copied, setCopied] = useState(false);

  const template = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;

  const handleCopy = () => {
    if (template) {
      navigator.clipboard.writeText(template.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DetailSheet
      open={!!template}
      onOpenChange={(open) => !open && closeTemplateDetail()}
      resetKey={selectedTemplateId}
      maxWidthClassName="sm:data-[side=right]:max-w-xl"
      bodyClassName="gap-6"
    >
      {template && (
        <>
          {/* Header */}
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-montserrat font-bold text-[20px] text-black-text">{template.name}</p>
                <StatusBadge status={template.category} bordered />
                <StatusBadge status={template.status} bordered />
              </div>
              <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                Last updated: {template.lastUpdated}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="size-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                onClick={() => {
                  closeTemplateDetail();
                  openDeleteTemplate(template);
                }}
                title="Delete Template"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Subject Section */}
          <div className="flex flex-col gap-1.5 w-full">
            <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Subject</p>
            <div className="bg-secondary/40 border border-border rounded-md p-3">
              <p className="font-montserrat font-semibold text-[13px] text-foreground">{template.subject}</p>
            </div>
          </div>

          {/* Body Section */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Body</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-montserrat text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy Body"}
              </button>
            </div>
            <div className="bg-secondary/30 border border-border rounded-md p-4">
              <pre className="font-montserrat font-normal text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
                {template.content}
              </pre>
            </div>
          </div>

          {/* Available Variables */}
          <div className="flex flex-col gap-2 w-full">
            <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Available Variables</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((v) => (
                <span
                  key={v}
                  className="font-montserrat text-[12px] font-medium text-purple bg-purple/10 border border-purple/20 px-2.5 py-1 rounded-sm cursor-pointer hover:bg-purple/20 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(v);
                  }}
                  title="Click to copy variable"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-secondary w-full mt-auto">
            <Button
              className="flex-1 px-4 gap-2 h-10 font-medium text-[13px]"
              onClick={() => {
                closeTemplateDetail();
                openNewTemplate(template);
              }}
            >
              <Edit2 className="size-3.5" />
              Edit Template
            </Button>
            <Button
              variant="outline"
              className="flex-1 px-4 gap-2 h-10 font-medium text-[13px]"
              onClick={() => {
                closeTemplateDetail();
                openSendEmail(template);
              }}
            >
              <Mail className="size-3.5" />
              Use Template
            </Button>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
