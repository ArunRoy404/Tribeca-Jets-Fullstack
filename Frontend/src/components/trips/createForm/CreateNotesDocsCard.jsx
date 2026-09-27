"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Notes and documents. The attachments are real uploads now — the old box
 * kept a file's name and size in memory and threw the file away. PUBLIC, so
 * the whole desk can open a trip's contract and operator confirmation.
 */
export default function CreateNotesDocsCard() {
  const { internalNotes, clientNotes, documentUrls, setField } = useCreateTripStore();

  return (
    <DetailCard title="Notes & Documents" description="Internal team notes, client-facing notes, and file attachments.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Internal Notes (Optional)">
          <Textarea className="min-h-24 rounded-sm text-sm" placeholder="Notes visible only to the Tribeca Jets team..." value={internalNotes || ""} onChange={(e) => setField?.("internalNotes", e.target.value)} />
        </FormField>
        <FormField label="Client Notes (Optional)">
          <Textarea className="min-h-24 rounded-sm text-sm" placeholder="Shared with the client — catering, special requests..." value={clientNotes || ""} onChange={(e) => setField?.("clientNotes", e.target.value)} />
        </FormField>
      </div>

      <FormField label="Documents (Optional)">
        <FileUpload
          variant="dropzone"
          kind="auto"
          visibility="PUBLIC"
          multiple
          accept={`${ACCEPT.document},${ACCEPT.image}`}
          heading="Drag & drop contracts or confirmations"
          description="PDF, Word, Excel or images"
          value={documentUrls}
          onUploaded={(data) => setField?.("documentUrls", [...(useCreateTripStore.getState().documentUrls ?? []), data?.url].filter(Boolean))}
          onRemove={(index) => setField?.("documentUrls", (documentUrls ?? []).filter((_, i) => i !== index))}
        />
      </FormField>
    </DetailCard>
  );
}
