"use client";

import { useState, useEffect } from "react";
import { Send, X } from "lucide-react";
import { useEmailTemplatesStore } from "@/store/useEmailTemplatesStore";
import { clientOptions } from "@/dummyData/createTripOptions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

export default function SendEmailDialog() {
  const open = useEmailTemplatesStore((s) => s.sendEmailOpen);
  const editingTemplate = useEmailTemplatesStore((s) => s.editingTemplate);
  const closeSendEmail = useEmailTemplatesStore((s) => s.closeSendEmail);
  const templates = useEmailTemplatesStore((s) => s.templates);

  const [selectedTplId, setSelectedTplId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const templateOptions = templates.map((t) => `${t.id} · ${t.name}`);

  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setSelectedTplId(`${editingTemplate.id} · ${editingTemplate.name}`);
        setSubject(editingTemplate.subject);
        setBody(editingTemplate.content);
      } else if (templates.length > 0) {
        const first = templates[0];
        setSelectedTplId(`${first.id} · ${first.name}`);
        setSubject(first.subject);
        setBody(first.content);
      }
    }
  }, [open, editingTemplate, templates]);

  const handleTemplateChange = (val) => {
    setSelectedTplId(val);
    const id = val.split(" · ")[0];
    const found = templates.find((t) => t.id === id);
    if (found) {
      setSubject(found.subject);
      setBody(found.content);
    }
  };

  const handleSend = () => {
    closeSendEmail();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeSendEmail()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              Send Email
            </DialogTitle>
            <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
              Compose or use an email template to contact a client or partner
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Use Template" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={selectedTplId}
              onChange={handleTemplateChange}
              options={templateOptions}
              placeholder="Select template"
              className={FIELD_CLASS}
            />
          </FormField>
          <FormField label="Recipient Client" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={recipient}
              onChange={setRecipient}
              options={clientOptions}
              placeholder="Select recipient"
              className={FIELD_CLASS}
            />
          </FormField>
        </div>

        <FormField label="Subject" labelClassName={LABEL_CLASS}>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className={FIELD_CLASS}
          />
        </FormField>

        <FormField label="Message Body" labelClassName={LABEL_CLASS}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body..."
            className="min-h-[180px] p-4 text-sm font-montserrat resize-y rounded-sm border-border"
          />
        </FormField>

        <div className="border-t border-secondary flex items-center justify-end gap-3 pt-4 w-full mt-2">
          <Button type="button" variant="outline" onClick={closeSendEmail} className="px-5 h-10 font-medium text-[13px] gap-1.5">
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="button" onClick={handleSend} className="px-5 h-10 font-medium text-[13px] gap-1.5">
            <Send className="size-4" />
            Send Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
