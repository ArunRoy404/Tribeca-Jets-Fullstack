"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";
import { useCreateEmailTemplate, useEmailTemplate, useMergeFields, useUpdateEmailTemplate } from "@/hooks/email-templates";
import { EMAIL_TEMPLATE_CATEGORIES, formatEmailCategory, toEmailTemplate } from "@/lib/email";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const CATEGORY_OPTIONS = EMAIL_TEMPLATE_CATEGORIES.map((value) => ({ value, label: formatEmailCategory(value) }));

/**
 * Adds or edits a template. The merge fields are the API's catalogue; a
 * click puts one where the cursor was in the body. A field the catalogue
 * does not have is refused by the API, named, and shown under the field.
 */
function TemplateForm({ template, onClose }) {
  const editing = Boolean(template);
  const { data: fields } = useMergeFields();
  const { mutate: create, isPending: creating } = useCreateEmailTemplate();
  const { mutate: update, isPending: updating } = useUpdateEmailTemplate();
  const bodyRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState(() => ({
    name: template?.name ?? "",
    category: template?.category ?? "GENERAL",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    active: template ? template.active : true,
  }));

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const insertField = (key) => {
    const token = `{${key}}`;
    const el = bodyRef.current;
    const start = el?.selectionStart ?? form.body.length;
    const end = el?.selectionEnd ?? form.body.length;
    setForm((prev) => ({ ...prev, body: prev.body.slice(0, start) + token + prev.body.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = () => {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      subject: form.subject.trim(),
      body: form.body.trim(),
      active: form.active,
    };
    const handlers = {
      onSuccess: onClose,
      onError: (error) => {
        setErrors(error?.fieldErrors ?? {});
        setFormError(error?.fieldErrors ? null : error?.message);
      },
    };
    if (editing) update({ id: template.id, ...payload }, handlers);
    else create(payload, handlers);
  };

  const ready = form.name.trim() && form.subject.trim() && form.body.trim();

  return (
    <>
      <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
        <div className="flex flex-col gap-2">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
            {editing ? "Edit Template" : "New Template"}
          </DialogTitle>
          <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
            {editing ? "Update reusable email template" : "Create a reusable email template for your workflows"}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Template Name" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => setField("name")(e.target.value)}
            placeholder="e.g. Quote Follow-up — Standard"
            className={FIELD_CLASS}
          />
        </FormField>
        <FormField label="Category" labelClassName={LABEL_CLASS} className="flex-1 min-w-0" error={errors.category}>
          <PickerSelect
            value={form.category}
            onChange={setField("category")}
            options={CATEGORY_OPTIONS}
            placeholder="Select category"
            className={FIELD_CLASS}
          />
        </FormField>
      </div>

      <FormField label="Subject" labelClassName={LABEL_CLASS} error={errors.subject}>
        <Input
          value={form.subject}
          onChange={(e) => setField("subject")(e.target.value)}
          placeholder="e.g. Following up on your charter quote for {route}"
          className={FIELD_CLASS}
        />
      </FormField>

      <FormField label="Body" labelClassName={LABEL_CLASS} error={errors.body}>
        <Textarea
          ref={bodyRef}
          value={form.body}
          onChange={(e) => setField("body")(e.target.value)}
          placeholder="Type your email template body here. Use variables like {client_name}, {route}, {total_price}..."
          className="min-h-45 p-4 text-sm font-montserrat resize-y rounded-sm border-border"
        />
      </FormField>

      <div className="flex flex-col gap-2 w-full">
        <p className="font-montserrat text-[13px] text-muted-foreground">
          Merge fields — click one to put it in the body. Each is filled from the record the email is about when it is sent.
        </p>
        <div className="flex flex-wrap gap-2">
          {(fields ?? []).map((field) => (
            <button
              key={field.key}
              type="button"
              title={`${field.label} — ${field.description}`}
              onClick={() => insertField(field.key)}
              className="font-montserrat text-[12px] font-medium text-purple bg-purple/10 border border-purple/20 px-2.5 py-1 rounded-sm cursor-pointer hover:bg-purple/20 transition-colors"
            >
              {`{${field.key}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 py-2">
        <Checkbox id="active-template" checked={form.active} onCheckedChange={(checked) => setField("active")(Boolean(checked))} />
        <label htmlFor="active-template" className="font-montserrat font-medium text-[14px] text-foreground cursor-pointer">
          Active (offered when composing an email)
        </label>
      </div>

      {formError && <p className="font-montserrat text-[13px] text-destructive">{formError}</p>}

      <div className="border-t border-secondary flex items-center justify-end gap-3 pt-4 w-full mt-2">
        <Button type="button" variant="outline" onClick={onClose} className="px-5 h-10 font-medium text-[13px] gap-1.5">
          <X className="size-4" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!ready || creating || updating}
          className="px-5 h-10 font-medium text-[13px] gap-1.5"
        >
          <Check className="size-4" />
          {editing ? "Save Changes" : "Save Template"}
        </Button>
      </div>
    </>
  );
}

export default function NewEmailTemplateDialog() {
  const open = useEmailTemplatesStore((s) => s.editorOpen);
  const editingTemplateId = useEmailTemplatesStore((s) => s.editingTemplateId);
  const closeEditor = useEmailTemplatesStore((s) => s.closeEditor);
  const { data } = useEmailTemplate(editingTemplateId);
  const template = editingTemplateId && data ? toEmailTemplate(data) : null;
  // An edit waits for the template to load, so the form never opens blank and posts the blanks back.
  const ready = !editingTemplateId || Boolean(template);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeEditor()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && ready && <TemplateForm key={editingTemplateId ?? "new"} template={template} onClose={closeEditor} />}
      </DialogContent>
    </Dialog>
  );
}
