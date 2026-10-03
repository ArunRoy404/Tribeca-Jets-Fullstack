"use client";

import DetailCard from "@/components/trips/DetailCard";
import FormField from "@/components/trips/FormField";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Notes. Documents are not attached here any more: a trip's contracts and
 * confirmations live in its folder in the Document Vault (#22), on the trip
 * page this form opens after saving — one place for a trip's documents, not
 * a list on the trip beside the vault's.
 */
export default function CreateNotesDocsCard() {
  const { internalNotes, clientNotes, setField } = useCreateTripStore();

  return (
    <DetailCard title="Notes" description="Internal team notes and client-facing notes. File documents on the trip's page once it is saved.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Internal Notes (Optional)">
          <Textarea className="min-h-24 rounded-sm text-sm" placeholder="Notes visible only to the Tribeca Jets team..." value={internalNotes || ""} onChange={(e) => setField?.("internalNotes", e.target.value)} />
        </FormField>
        <FormField label="Client Notes (Optional)">
          <Textarea className="min-h-24 rounded-sm text-sm" placeholder="Shared with the client — catering, special requests..." value={clientNotes || ""} onChange={(e) => setField?.("clientNotes", e.target.value)} />
        </FormField>
      </div>
    </DetailCard>
  );
}
