"use client";

import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import StatusBadge from "@/components/common/StatusBadge";
import { useSentEmail } from "@/hooks/email-templates";
import { toSentEmail } from "@/lib/email";

/**
 * One sent email, exactly as it went out — merge fields filled, never
 * re-rendered from today's template. Read-only: an email cannot be unsent.
 */
export default function SentEmailDetailSheet({ emailId, onClose }) {
  const { data } = useSentEmail(emailId);
  const email = data ? toSentEmail(data) : null;

  return (
    <DetailSheet
      open={Boolean(emailId) && Boolean(email)}
      onOpenChange={(open) => !open && onClose?.()}
      resetKey={emailId}
      maxWidthClassName="sm:data-[side=right]:max-w-xl"
      bodyClassName="gap-6"
    >
      {email && (
        <>
          <div className="border-b border-secondary flex flex-col gap-2 items-start pb-4 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-montserrat font-bold text-[20px] text-black-text">{email.subject}</p>
              <StatusBadge status={email.statusLabel} bordered />
            </div>
            <p className="font-montserrat text-[12px] text-muted-foreground">{email.statusHint}</p>
            {email.error && <p className="font-montserrat text-[12px] text-destructive">{email.error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <DetailField label="To" value={`${email.to} <${email.toEmail}>`} />
            <DetailField label="Recipient" value={email.recipientKind} />
            <DetailField label="Sent" value={email.sentAt} />
            <DetailField label="Sent by" value={email.sentBy} />
            <DetailField label="About" value={email.about} />
            <DetailField label="Template" value={email.template} />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <p className="font-montserrat font-semibold text-[13px] text-muted-foreground">Message</p>
            <div className="bg-secondary/30 border border-border rounded-md p-4">
              <pre className="font-montserrat font-normal text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
                {email.body}
              </pre>
            </div>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
