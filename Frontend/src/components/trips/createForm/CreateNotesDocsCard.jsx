"use client";

import { FileText, X, Upload } from "lucide-react";
import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTripStore } from "@/store/useCreateTripStore";

export default function CreateNotesDocsCard() {
  const state = useCreateTripStore();
  const {
    internalNotes,
    clientNotes,
    attachments,
    setField,
    addAttachment,
    removeAttachment,
  } = state || {};

  return (
    <DetailCard title="Notes & Documents" description="Internal team notes, client-facing notes, and file attachments.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Internal Notes">
          <Textarea
            className="min-h-24 rounded-sm text-sm"
            placeholder="Notes visible only to the Tribeca Jets team..."
            value={internalNotes || ""}
            onChange={(e) => setField?.("internalNotes", e.target.value)}
          />
        </FormField>
        <FormField label="Client Notes">
          <Textarea
            className="min-h-24 rounded-sm text-sm"
            placeholder="Notes shared with the client (e.g. catering preferences, special requests)..."
            value={clientNotes || ""}
            onChange={(e) => setField?.("clientNotes", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Attachments">
        <div className="flex flex-col gap-2">
          {attachments?.map((file, index) => (
            <div key={index} className="flex items-center gap-2.5 rounded-sm bg-secondary p-2.5">
              <div className="flex items-center justify-center rounded-sm bg-info/10 text-info size-8 shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="flex flex-col">
                <p className="font-montserrat font-medium text-[13px] text-foreground">{file?.name}</p>
                <p className="font-montserrat text-[11px] text-muted-foreground">{file?.size}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment?.(index)}
                className="ml-auto flex items-center justify-center size-6 cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <label className="w-fit">
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addAttachment?.({ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` });
              }}
            />
            <span className="flex items-center gap-2 px-4 h-8 rounded-sm border border-border font-montserrat text-[13px] text-foreground cursor-pointer hover:bg-muted">
              <Upload className="size-3.5" />
              Upload Document
            </span>
          </label>
        </div>
      </FormField>
    </DetailCard>
  );
}
