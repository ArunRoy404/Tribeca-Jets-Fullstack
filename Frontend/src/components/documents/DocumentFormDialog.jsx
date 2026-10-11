"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import { CommonDatePicker } from "@/components/common/DatePicker";
import FileUpload from "@/components/common/FileUpload";
import ClientPicker from "@/components/clients/ClientPicker";
import TripPicker from "@/components/trips/TripPicker";
import OperatorPicker from "@/components/operators/OperatorPicker";
import { useCreateDocument, useUpdateDocument } from "@/hooks/documents";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Module, Action } from "@/lib/access";
import { optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_OWNERS,
  SENSITIVE_DOCUMENT_CATEGORIES,
  formatDocumentCategory,
  formatDocumentOwner,
} from "@/lib/document";

const OWNER_FIELD = { CLIENT: "clientId", TRIP: "tripId", OPERATOR: "operatorId" };

/**
 * The folder picker, using shared server-paginated pickers (ClientPicker,
 * TripPicker, OperatorPicker) over the real directory in the caller's scope.
 */
function OwnerPicker({ ownerType, ownerId, onTypeChange, onIdChange, error }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex w-full flex-col gap-2">
        <span className="font-montserrat text-base font-medium text-foreground">Folder</span>
        <CommonSelect
          value={ownerType}
          onChange={onTypeChange}
          options={DOCUMENT_OWNERS.map((value) => ({ value, label: formatDocumentOwner(value) }))}
          placeholder="Client, trip or operator"
        />
      </div>
      <div className="flex w-full flex-col gap-2">
        <span className="font-montserrat text-base font-medium text-foreground">
          {ownerType ? formatDocumentOwner(ownerType) : "Record"}
        </span>
        {ownerType === "CLIENT" ? (
          <ClientPicker
            value={ownerId}
            onChange={onIdChange}
            placeholder="Select a client..."
            error={error}
          />
        ) : ownerType === "TRIP" ? (
          <TripPicker
            value={ownerId}
            onChange={onIdChange}
            placeholder="Select a trip..."
            error={error}
          />
        ) : ownerType === "OPERATOR" ? (
          <OperatorPicker
            value={ownerId}
            onChange={onIdChange}
            placeholder="Select an operator..."
            error={error}
          />
        ) : (
          <CommonSelect
            disabled
            value=""
            placeholder="Choose a folder first"
            options={[]}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Files a document, or edits one. `owner` fixes the folder (`{ type, id,
 * label }`) when opened from a client, trip or operator page; without it the
 * form asks. The file uploads first and privately — it opens through the
 * document, never directly. Passports and IDs are offered only to a role
 * that may file them.
 */
function DocumentForm({ document, owner, onClose }) {
  const editing = Boolean(document);
  const { canAccess } = usePermissions();
  const maySensitive = canAccess(Module.DOCUMENTS, Action.VIEW_SENSITIVE);
  const { mutate: create, isPending: creating } = useCreateDocument();
  const { mutate: update, isPending: updating } = useUpdateDocument();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState(() => ({
    title: document?.raw?.title ?? "",
    category: document?.category ?? "OTHER",
    fileUrl: document?.fileUrl ?? "",
    expiresOn: document?.expiresOn ? toDateInput(document.expiresOn) : "",
    notes: document?.notes ?? "",
    ownerType: owner?.type ?? "",
    ownerId: owner?.id ?? "",
  }));
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const categoryOptions = DOCUMENT_CATEGORIES.filter((c) => maySensitive || !SENSITIVE_DOCUMENT_CATEGORIES.includes(c)).map(
    (value) => ({ value, label: formatDocumentCategory(value) }),
  );

  const handleUploaded = (data) =>
    setForm((prev) => ({
      ...prev,
      fileUrl: data?.url ?? "",
      // The file's name is the sensible first title; a typed one is kept.
      title: prev.title || (data?.filename ?? "").replace(/\.[^.]+$/, ""),
    }));

  const handleSave = () => {
    const handlers = {
      onSuccess: onClose,
      onError: (error) => {
        setErrors(error?.fieldErrors ?? {});
        setFormError(error?.fieldErrors ? null : error?.message);
      },
    };
    const common = {
      title: form.title.trim(),
      category: form.category,
      expiresOn: optionalText(form.expiresOn, { editing }),
      notes: optionalText(form.notes, { editing }),
    };
    if (editing) {
      update(
        { id: document.id, ...common, ...(form.fileUrl !== document.fileUrl ? { fileUrl: form.fileUrl } : {}) },
        handlers,
      );
    } else {
      create({ ...common, fileUrl: form.fileUrl, [OWNER_FIELD[form.ownerType]]: form.ownerId }, handlers);
    }
  };

  const ready = form.title.trim() && form.fileUrl && (editing || (form.ownerType && form.ownerId));

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="border-b border-secondary flex flex-col gap-2 pb-4 w-full">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
          {editing ? "Edit Document" : "File a Document"}
        </DialogTitle>
        <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
          {owner ? `In ${owner.label}'s folder` : editing ? `In ${document?.ownerLabel}'s folder` : "Choose the folder it belongs in"}
        </p>
      </div>

      {!owner && !editing && (
        <OwnerPicker
          ownerType={form.ownerType}
          ownerId={form.ownerId}
          onTypeChange={(value) => setForm((prev) => ({ ...prev, ownerType: value, ownerId: "" }))}
          onIdChange={set("ownerId")}
        />
      )}

      <div className="flex w-full flex-col gap-2">
        <span className="font-montserrat text-base font-medium text-foreground">{editing ? "File (replace)" : "File"}</span>
        <FileUpload
          variant="dropzone"
          kind="auto"
          visibility="PRIVATE"
          heading="Drag & drop the document"
          description="PDF, Word, Excel, text, or a photo of it"
          value={form.fileUrl}
          onUploaded={handleUploaded}
          onRemove={() => set("fileUrl")("")}
        />
        {errors.fileUrl && <p className="font-montserrat text-[12px] text-destructive">{errors.fileUrl}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CommonInput
          label="Title"
          name="title"
          required
          placeholder="Charter agreement — Aspen, March"
          value={form.title}
          error={errors.title}
          onChange={(e) => set("title")(e.target.value)}
        />
        <div className="flex w-full flex-col gap-2">
          <span className="font-montserrat text-base font-medium text-foreground">Category</span>
          <CommonSelect value={form.category} onChange={set("category")} options={categoryOptions} />
          {SENSITIVE_DOCUMENT_CATEGORIES.includes(form.category) && (
            <p className="font-montserrat text-[12px] text-muted-foreground">
              Restricted: only roles allowed to see passports and IDs can open it.
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <span className="font-montserrat text-base font-medium text-foreground">Expires (Optional)</span>
        <CommonDatePicker value={form.expiresOn} onChange={set("expiresOn")} placeholder="No expiry" />
        {errors.expiresOn && <p className="font-montserrat text-[12px] text-destructive">{errors.expiresOn}</p>}
      </div>

      <CommonInput
        label="Notes (Optional)"
        name="notes"
        type="textarea"
        rows={2}
        placeholder="Signed copy, both pages."
        value={form.notes}
        error={errors.notes}
        onChange={(e) => set("notes")(e.target.value)}
      />

      {(formError || errors.clientId) && (
        <p className="font-montserrat text-[13px] text-destructive">{formError ?? errors.clientId}</p>
      )}

      <div className="border-t border-secondary flex items-center justify-end gap-3 pt-4 w-full">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!ready || creating || updating}>
          {editing ? "Save Changes" : "File Document"}
        </Button>
      </div>
    </div>
  );
}

/**
 * `document` is a row from `toDocumentRow` when editing; `owner` fixes the
 * folder when filing from a record's page.
 */
export default function DocumentFormDialog({ open, onOpenChange, document, owner }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        {open && (
          <DocumentForm
            key={document?.id ?? owner?.id ?? "new"}
            document={document}
            owner={owner}
            onClose={() => onOpenChange?.(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
