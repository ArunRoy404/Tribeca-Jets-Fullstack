"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import { useEmailTemplates, usePreviewEmail, useSendEmail } from "@/hooks/email-templates";
import { useClients } from "@/hooks/clients";
import { useOperators } from "@/hooks/operators";
import { useTrips } from "@/hooks/trips";
import { displayName } from "@/lib/client";
import { formatTripReference } from "@/lib/trip";
import { emailContext, formatEmailCategory } from "@/lib/email";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";
const NONE = "__none__";
const KIND_OPTIONS = [
  { value: "client", label: "A client" },
  { value: "operator", label: "An operator" },
];

/**
 * The one way to email somebody from the CRM (Email Templates, #21).
 *
 * A screen that knows who the email is for passes `context` — the client or
 * operator, and any trip, quote or invoice it is about — and the recipient is
 * fixed. The templates screen passes nothing, and the form asks.
 *
 * The API fills the template (`POST /emails/preview`) and names the fields it
 * could not fill; those stay in the text as `{tokens}` and Send waits until
 * the broker has picked the record they come from or typed the fact over
 * them. Nothing is filled or guessed in the browser.
 */
function ComposeForm({ context = {}, category, templateId: initialTemplateId, title, description, onClose, onSent }) {
  const fixedRecipient = Boolean(context.clientId || context.operatorId);

  const [kind, setKind] = useState("client");
  const [pickedClientId, setPickedClientId] = useState("");
  const [pickedOperatorId, setPickedOperatorId] = useState("");
  const [pickedTripId, setPickedTripId] = useState(NONE);
  /** What the broker picked; null until they pick, when the screen's default stands. */
  const [chosenTemplateId, setTemplateId] = useState(initialTemplateId ?? null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const { data: templates } = useEmailTemplates({ active: true, limit: 100, sortBy: "name", sortOrder: "asc" });
  // Open on the screen's own kind of template when one exists — a payment
  // reminder from Receivables, a follow-up from a quote — until the broker
  // picks another. Derived, not copied into state.
  const templatesReady = Boolean(templates);
  const templateId =
    chosenTemplateId ?? (category ? (templates?.data ?? []).find((t) => t.category === category)?.id : null) ?? NONE;
  const { data: clients } = useClients({ limit: 100 }, { enabled: !fixedRecipient });
  const { data: operators } = useOperators({ limit: 100 }, { enabled: !fixedRecipient });

  const clientId = fixedRecipient ? context.clientId : kind === "client" ? pickedClientId : "";
  const operatorId = fixedRecipient ? context.operatorId : kind === "operator" ? pickedOperatorId : "";
  const tripsFilter = clientId ? { clientId } : operatorId ? { operatorId } : null;
  const { data: trips } = useTrips(
    { ...tripsFilter, limit: 100, sortBy: "departureDate", sortOrder: "desc" },
    { enabled: !fixedRecipient && Boolean(tripsFilter) },
  );

  const request = useMemo(
    () =>
      emailContext({
        clientId,
        operatorId,
        tripId: fixedRecipient ? context.tripId : pickedTripId !== NONE ? pickedTripId : undefined,
        quoteId: context.quoteId,
        invoiceId: context.invoiceId,
        templateId: templateId && templateId !== NONE ? templateId : undefined,
      }),
    [clientId, operatorId, fixedRecipient, context.tripId, context.quoteId, context.invoiceId, pickedTripId, templateId],
  );
  const hasRecipient = Boolean(request.clientId || request.operatorId);

  const templateOptions = useMemo(
    () => [
      { value: NONE, label: "No template — write it" },
      ...(templates?.data ?? []).map((t) => ({ value: t.id, label: `${t.name} · ${formatEmailCategory(t.category)}` })),
    ],
    [templates?.data],
  );

  // Re-fill whenever the template or what the email is about changes. The
  // draft is replaced only when a template was picked, so switching the trip
  // on a hand-written email keeps what was typed.
  const { mutate: fillTemplate, isPending: filling } = usePreviewEmail();
  const requestKey = JSON.stringify(request);
  useEffect(() => {
    // Wait for the library, so the screen's default template is filled once
    // rather than a blank email first and the template a moment later.
    if (!hasRecipient || !templatesReady) return;
    fillTemplate(JSON.parse(requestKey), {
      onSuccess: (data) => {
        setPreview(data);
        setPreviewError(null);
        if (data?.templateId) {
          setSubject(data.subject ?? "");
          setBody(data.body ?? "");
        }
      },
      onError: (error) => {
        setPreview(null);
        setPreviewError(error?.message ?? "Could not fill this template");
      },
    });
  }, [requestKey, hasRecipient, templatesReady, fillTemplate]);

  // What is still a token in the draft — a fact the broker has not supplied.
  const stillMissing = (preview?.missing ?? []).filter(
    (field) => subject.includes(`{${field.key}}`) || body.includes(`{${field.key}}`),
  );
  const toEmail = preview?.to?.email ?? null;

  const { mutate: send, isPending: sending } = useSendEmail();
  const canSend = hasRecipient && Boolean(toEmail) && subject.trim() && body.trim() && !stillMissing.length && !filling;
  const handleSend = () =>
    send(
      { ...request, subject, body },
      {
        onSuccess: (email) => {
          onSent?.(email);
          onClose?.();
        },
      },
    );

  return (
    <>
      <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
        <div className="flex flex-col gap-2">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
            {title ?? "Send Email"}
          </DialogTitle>
          <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
            {description ?? "Compose, or start from a template, to email a client or an operator"}
          </p>
        </div>
      </div>

      {!fixedRecipient && (
        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Send to" labelClassName={LABEL_CLASS} className="sm:w-48 w-full shrink-0">
            <PickerSelect
              value={kind}
              onChange={(value) => {
                setKind(value);
                setPickedTripId(NONE);
              }}
              options={KIND_OPTIONS}
              className={FIELD_CLASS}
            />
          </FormField>
          <FormField label={kind === "client" ? "Client" : "Operator"} labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            {kind === "client" ? (
              <PickerSelect
                value={pickedClientId}
                onChange={(value) => {
                  setPickedClientId(value);
                  setPickedTripId(NONE);
                }}
                options={(clients?.data ?? []).map((c) => ({ value: c.id, label: displayName(c) }))}
                placeholder="Select a client"
                className={FIELD_CLASS}
              />
            ) : (
              <PickerSelect
                value={pickedOperatorId}
                onChange={(value) => {
                  setPickedOperatorId(value);
                  setPickedTripId(NONE);
                }}
                options={(operators?.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
                placeholder="Select an operator"
                className={FIELD_CLASS}
              />
            )}
          </FormField>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Use Template" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={templateId}
            onChange={setTemplateId}
            options={templateOptions}
            placeholder="Select template"
            className={FIELD_CLASS}
          />
        </FormField>
        {!fixedRecipient && (
          <FormField label="About a trip (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={pickedTripId}
              onChange={setPickedTripId}
              options={[
                { value: NONE, label: "No trip" },
                ...(trips?.data ?? []).map((t) => ({ value: t.id, label: formatTripReference(t.reference) })),
              ]}
              placeholder={tripsFilter ? "Select a trip" : "Pick the recipient first"}
              className={FIELD_CLASS}
            />
          </FormField>
        )}
      </div>

      {hasRecipient && preview && (
        <p className="font-montserrat text-[14px] text-foreground">
          <span className="text-muted-foreground">To: </span>
          {preview.to?.name}
          {toEmail ? <span className="text-muted-foreground"> &lt;{toEmail}&gt;</span> : null}
        </p>
      )}
      {hasRecipient && preview && !toEmail && (
        <Notice>
          {preview.to?.name} has no email address on file. Add one to their record, then come back to send this.
        </Notice>
      )}
      {previewError && <Notice>{previewError}</Notice>}

      <FormField label="Subject" labelClassName={LABEL_CLASS}>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className={FIELD_CLASS} />
      </FormField>

      <FormField label="Message Body" labelClassName={LABEL_CLASS}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Email body..."
          className="min-h-45 p-4 text-sm font-montserrat resize-y rounded-sm border-border"
        />
      </FormField>

      {stillMissing.length > 0 && (
        <Notice>
          Not on file for this email: {stillMissing.map((field) => field.label).join(", ")}.{" "}
          {fixedRecipient ? "Type it in over the {field} in the text." : "Pick the trip it is about, or type it in over the {field}."}
        </Notice>
      )}

      <div className="border-t border-secondary flex items-center justify-end gap-3 pt-4 w-full mt-2">
        <Button type="button" variant="outline" onClick={onClose} className="px-5 h-10 font-medium text-[13px] gap-1.5">
          <X className="size-4" />
          Cancel
        </Button>
        <Button type="button" onClick={handleSend} disabled={!canSend || sending} className="px-5 h-10 font-medium text-[13px] gap-1.5">
          <Send className="size-4" />
          Send Email
        </Button>
      </div>
    </>
  );
}

function Notice({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-warning/30 bg-warning/10 p-3 w-full">
      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
      <p className="font-montserrat text-[13px] text-foreground">{children}</p>
    </div>
  );
}

/**
 * `open` / `onOpenChange` are the host's. The form mounts fresh on every
 * open, so a second email never starts with the first one's draft.
 */
export default function ComposeEmailDialog({ open, onOpenChange, ...props }) {
  const close = () => onOpenChange?.(false);
  return (
    <Dialog open={Boolean(open)} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && <ComposeForm {...props} onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}
