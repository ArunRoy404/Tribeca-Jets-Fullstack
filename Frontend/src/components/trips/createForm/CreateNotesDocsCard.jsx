"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Internal team notes, client notes, and trip documents staged for upload.
 * Attached documents are automatically filed to this trip's document vault.
 */
export default function CreateNotesDocsCard() {
  const {
    internalNotes,
    clientNotes,
    attachments = [],
    setField,
    addAttachment,
    removeAttachment,
  } = useCreateTripStore();

  return (
    <DetailCard
      title="Notes & Attachments"
      description="Internal team notes, client-facing notes, and trip documents or contracts."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Internal Notes (Optional)">
          <Textarea
            className="min-h-24 rounded-sm text-sm"
            placeholder="Notes visible only to the Tribeca Jets team..."
            value={internalNotes || ""}
            onChange={(e) => setField?.("internalNotes", e.target.value)}
          />
        </FormField>
        <FormField label="Client Notes (Optional)">
          <Textarea
            className="min-h-24 rounded-sm text-sm"
            placeholder="Shared with the client — catering, special requests..."
            value={clientNotes || ""}
            onChange={(e) => setField?.("clientNotes", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Attachments (Optional)">
        <FileUpload
          variant="dropzone"
          kind="document"
          visibility="PRIVATE"
          accept={ACCEPT.document}
          multiple
          value={attachments.map((a) => (typeof a === "string" ? a : a?.url))}
          onUploaded={(data) => {
            if (data?.url) {
              addAttachment?.({
                url: data.url,
                title: data.filename || "Trip Document",
              });
            }
          }}
          onRemove={(index) => {
            removeAttachment?.(index);
          }}
          heading="Upload Trip Documents"
          description="Drag & drop contracts, charter agreements, or itineraries (up to 25 MB). Filed to this trip's document vault."
        />
      </FormField>
    </DetailCard>
  );
}
