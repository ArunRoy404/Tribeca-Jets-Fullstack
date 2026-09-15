"use client";

import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";
import { templateCategoryOptions } from "@/dummyData/emailTemplates";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const categoryOptions = templateCategoryOptions.filter((c) => c !== "All");

const EMPTY_FORM = {
  name: "",
  category: "General",
  subject: "",
  content: "",
  active: true,
};

export default function NewEmailTemplateDialog() {
  const open = useEmailTemplatesStore((s) => s.newTemplateOpen);
  const editingTemplate = useEmailTemplatesStore((s) => s.editingTemplate);
  const closeNewTemplate = useEmailTemplatesStore((s) => s.closeNewTemplate);
  const addTemplate = useEmailTemplatesStore((s) => s.addTemplate);
  const updateTemplate = useEmailTemplatesStore((s) => s.updateTemplate);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setForm({
          name: editingTemplate.name || "",
          category: editingTemplate.category || "General",
          subject: editingTemplate.subject || "",
          content: editingTemplate.content || "",
          active: editingTemplate.status === "Active",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editingTemplate]);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    closeNewTemplate();
  };

  const handleSave = () => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, {
        name: form.name || "Untitled Template",
        category: form.category,
        subject: form.subject,
        content: form.content,
        status: form.active ? "Active" : "Inactive",
      });
    } else {
      addTemplate({
        name: form.name || "Untitled Template",
        category: form.category,
        subject: form.subject,
        content: form.content,
        status: form.active ? "Active" : "Inactive",
      });
    }
    handleClose();
  };

  const isEditing = !!editingTemplate;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              {isEditing ? "Edit Template" : "New Template"}
            </DialogTitle>
            <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
              {isEditing ? "Update reusable email template" : "Create a reusable email template for your workflows"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Template Name" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <Input
              value={form.name}
              onChange={(e) => setField("name")(e.target.value)}
              placeholder="e.g. Quote Follow-up — Standard"
              className={FIELD_CLASS}
            />
          </FormField>
          <FormField label="Category" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.category}
              onChange={setField("category")}
              options={categoryOptions}
              placeholder="Select category"
              className={FIELD_CLASS}
            />
          </FormField>
        </div>

        <FormField label="Subject" labelClassName={LABEL_CLASS}>
          <Input
            value={form.subject}
            onChange={(e) => setField("subject")(e.target.value)}
            placeholder="e.g. Following up on your charter quote for {route}"
            className={FIELD_CLASS}
          />
        </FormField>

        <FormField label="Body" labelClassName={LABEL_CLASS}>
          <Textarea
            value={form.content}
            onChange={(e) => setField("content")(e.target.value)}
            placeholder="Type your email template body here. Use variables like {client_name}, {route}, {total_price}..."
            className="min-h-[180px] p-4 text-sm font-montserrat resize-y rounded-sm border-border"
          />
        </FormField>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="active-template"
            checked={form.active}
            onCheckedChange={(checked) => setField("active")(!!checked)}
          />
          <label
            htmlFor="active-template"
            className="font-montserrat font-medium text-[14px] text-foreground cursor-pointer"
          >
            Active (available for use)
          </label>
        </div>

        <div className="border-t border-secondary flex items-center justify-end gap-3 pt-4 w-full mt-2">
          <Button type="button" variant="outline" onClick={handleClose} className="px-5 h-10 font-medium text-[13px] gap-1.5">
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="px-5 h-10 font-medium text-[13px] gap-1.5">
            <Check className="size-4" />
            {isEditing ? "Save Changes" : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
