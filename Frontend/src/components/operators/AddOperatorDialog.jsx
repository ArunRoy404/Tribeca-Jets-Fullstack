"use client";

import { useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useOperatorsStore } from "@/store/useOperatorsStore";
import { useCreateOperator, useUpdateOperator } from "@/hooks/operators";
import { useFileDocuments } from "@/hooks/documents";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import FileUpload from "@/components/common/FileUpload";
import CommonSelect from "@/components/common/CommonSelect";
import {
  FILTERABLE_OPERATOR_STATUSES,
  PAYMENT_TERMS_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  formatOperatorStatus,
} from "@/lib/operator";
import { formatDocumentCategory } from "@/lib/document";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { optionalText } from "@/lib/form";

function FieldWrapper({ label, children, optional, error }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[12px] font-medium text-foreground flex items-center justify-between">
          <span>{label}</span>
          {optional && <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>}
        </label>
      )}
      {children}
      {/* The API says which field it rejected; showing it beside that field
          beats a toast that names it in prose. */}
      {error && (
        <p className="font-montserrat text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * The dialog's multi-line field.
 *
 * Extracted the moment a second one was needed: the cancellation policy and
 * the sourcing notes are the same control with different text, and two
 * hand-styled `<textarea>` blocks in one file drift the first time either is
 * touched.
 */
function DialogTextarea({ rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className="w-full p-2.5 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-y"
      {...props}
    />
  );
}

/** The shared select, at the height of this form's inputs. */
const SELECT_CLASS = "data-[size=default]:h-10";

/**
 * A blank choice for an optional field. The select cannot hold "" as a
 * value, so blank travels as this sentinel inside the control and as ""
 * everywhere else — "Not rated", never a guess.
 */
const BLANK = "__none__";

function OptionalSelect({ value, onChange, options, blankLabel }) {
  return (
    <CommonSelect
      value={value || BLANK}
      onChange={(next) => onChange(next === BLANK ? "" : next)}
      options={[{ value: BLANK, label: blankLabel }, ...options]}
      className={SELECT_CLASS}
    />
  );
}

/**
 * The categories an operator's file is likely to be. Insurance and operator
 * certificates carry an expiry date, set on the Documents tab afterwards.
 */
const OPERATOR_DOCUMENT_CATEGORIES = ["OPERATOR_CERTIFICATE", "INSURANCE_CERTIFICATE", "CHARTER_AGREEMENT", "OTHER"].map(
  (value) => ({ value, label: formatDocumentCategory(value) }),
);

function SectionHeader({ title }) {
  return (
    <div className="font-montserrat text-[12px] font-semibold text-muted-foreground pt-1 pb-0.5 border-b border-border/40 uppercase tracking-wide">
      {title}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  status: "ACTIVE",
  homeBase: "",
  website: "",
  generalEmail: "",
  generalPhone: "",
  primaryContact: "",
  email: "",
  phone: "",
  aircraftTypesInput: "",
  serviceRoutesInput: "",
  // Blank, not "4.8": a pre-filled rating makes every operator someone adds
  // carry a score nobody gave them. The input keeps "4.8" as a placeholder,
  // which is a format hint and is never submitted.
  reliability: "",
  // Blank like reliability: a pre-filled "4.9" put a safety rating nobody
  // gave on every operator added.
  safety: "",
  responseSpeed: "",
  cancellationPolicy: "",
  paymentTerms: "",
  sourcingNotes: "",
};

/**
 * Values the row mapper renders as an em dash are display text, not data —
 * they must not be written back into an input as the literal "—".
 */
function fieldValue(value) {
  return !value || value === "\u2014" ? "" : String(value);
}

function initialForm(operator) {
  if (!operator) return EMPTY_FORM;
  const list = (value) =>
    Array.isArray(value) ? value.join(", ") : fieldValue(value);

  return {
    name: operator.name || "",
    // The API speaks enum constants; `rawStatus` is the unmapped one.
    status: operator.rawStatus || "ACTIVE",
    homeBase: fieldValue(operator.homeBase),
    website: fieldValue(operator.website),
    generalEmail: fieldValue(operator.generalEmail),
    generalPhone: fieldValue(operator.generalPhone),
    primaryContact: fieldValue(operator.primaryContact),
    // The contact's own lines — never the table's fallback to the general
    // ones, or saving would copy the general number onto the contact.
    email: fieldValue(operator.contactEmail),
    phone: fieldValue(operator.contactPhone),
    aircraftTypesInput: list(operator.aircraftTypes),
    serviceRoutesInput: list(operator.serviceRoutes),
    reliability:
      operator.rawReliability === null || operator.rawReliability === undefined
        ? ""
        : String(operator.rawReliability),
    safety: operator.rawSafety === null || operator.rawSafety === undefined ? "" : String(operator.rawSafety),
    responseSpeed: operator.rawResponseSpeed ?? "",
    cancellationPolicy: fieldValue(operator.cancellationPolicy),
    paymentTerms: operator.rawPaymentTerms ?? "",
    sourcingNotes: operator.sourcingNotes || "",
  };
}

export default function AddOperatorDialog() {
  const addModalOpen = useOperatorsStore((s) => s.addModalOpen);
  const editingOperator = useOperatorsStore((s) => s.editingOperator);
  const closeAddModal = useOperatorsStore((s) => s.closeAddModal);

  return (
    <Dialog open={addModalOpen} onOpenChange={(next) => !next && closeAddModal()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        {/*
          Keyed so the form remounts with fresh state whenever the dialog opens
          on a different operator — React's own answer to "reset state when a
          prop changes". An effect calling setState renders once with the
          previous operator's values before correcting itself.
        */}
        {addModalOpen && (
          <OperatorForm
            key={editingOperator?.id ?? "new"}
            editingOperator={editingOperator}
            onDone={closeAddModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OperatorForm({ editingOperator, onDone }) {
  const create = useCreateOperator();
  const update = useUpdateOperator();
  const fileDocuments = useFileDocuments();
  const mutation = editingOperator ? update : create;
  const fieldErrors = mutation?.error?.fieldErrors ?? {};

  const [formData, setFormData] = useState(() => initialForm(editingOperator));
  // Files uploaded in this form, filed into the operator's vault folder once
  // the operator itself has saved (a new one has no id before that).
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState("OTHER");
  const { canWrite } = usePermissions();
  const mayFileDocuments = canWrite(Permission.MANAGE_DOCUMENTS);
  const closeAddModal = onDone;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // The shared uploader holds the URLs; the title of each is the file's own
  // name, kept here for the vault.
  const addDocument = (upload) => {
    if (!upload?.url) return;
    setDocuments((prev) =>
      prev.some((doc) => doc.fileUrl === upload.url)
        ? prev
        : [...prev, { fileUrl: upload.url, title: upload.filename ?? "Document" }],
    );
  };
  const removeDocument = (index) => setDocuments((prev) => prev.filter((_, i) => i !== index));

  // The operator saved: file what was attached, then close.
  const afterSave = (operator) => {
    if (!documents.length || !operator?.id) return closeAddModal();
    fileDocuments.mutate(
      {
        owner: { operatorId: operator.id },
        documents: documents.map(({ title, fileUrl }) => ({ title, fileUrl, category: documentType })),
      },
      { onSettled: closeAddModal },
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Empty, never a plausible tail. A blank field meant "we don't know what
    // they fly"; defaulting it to ["Global 7500"] put an aircraft nobody
    // entered into the operator's fleet list, and it read exactly like data
    // someone had supplied.
    const aircraftTypes = formData.aircraftTypesInput
      ? formData.aircraftTypesInput.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const serviceRoutes = formData.serviceRoutesInput
      ? formData.serviceRoutesInput.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    // Absent means "leave it alone", null means "clear it" — the API
    // distinguishes the two, so a create omits and an edit nulls.
    const editing = Boolean(editingOperator);
    const optional = (value) => optionalText(value, { editing });

    const payload = {
      name: formData.name.trim(),
      status: formData.status,
      homeBase: optional(formData.homeBase),
      website: optional(formData.website),
      generalEmail: optional(formData.generalEmail),
      generalPhone: optional(formData.generalPhone),
      primaryContact: optional(formData.primaryContact),
      contactEmail: optional(formData.email),
      contactPhone: optional(formData.phone),
      // Replaced wholesale, not merged: the field holds the complete list.
      aircraftTypes,
      serviceRoutes,
      reliabilityRating: formData.reliability
        ? Number.parseFloat(formData.reliability)
        : editing
          ? null
          : undefined,
      safetyRating: formData.safety
        ? Number.parseFloat(formData.safety)
        : editing
          ? null
          : undefined,
      responseSpeed: formData.responseSpeed || (editing ? null : undefined),
      cancellationPolicy: optional(formData.cancellationPolicy),
      paymentTerms: formData.paymentTerms || (editing ? null : undefined),
      sourcingNotes: optional(formData.sourcingNotes),
    };

    if (editing) {
      update.mutate({ id: editingOperator.id, ...payload }, { onSuccess: afterSave });
      return;
    }
    create.mutate(payload, { onSuccess: afterSave });
  };

  return (
    <>
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editingOperator ? "Edit Operator" : "Add Operator"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editingOperator
              ? "Update operator details and preferences in the CRM database."
              : "Register a new aircraft operator profile in the database."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Section 1: General Information */}
          <SectionHeader title="Operator Information" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Operator name" error={fieldErrors?.name}>
              <Input
                placeholder="FLEXJet"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Status">
              {/* The enum goes on the wire, the label goes on the screen. */}
              <CommonSelect
                value={formData.status}
                onChange={(value) => handleChange("status", value)}
                options={FILTERABLE_OPERATOR_STATUSES.map((status) => ({
                  value: status,
                  label: formatOperatorStatus(status),
                }))}
                className={SELECT_CLASS}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Home Base" error={fieldErrors?.homeBase}>
              <Input
                placeholder="Cleveland, OH"
                value={formData.homeBase}
                onChange={(e) => handleChange("homeBase", e.target.value)}
                required
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Website (Optional)" optional error={fieldErrors?.website}>
              <Input
                placeholder="www.flexjet.com"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="General email (Optional)" error={fieldErrors?.generalEmail}>
              <Input
                type="email"
                placeholder="ops@flexjet.com"
                value={formData.generalEmail}
                onChange={(e) => handleChange("generalEmail", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="General phone (Optional)" error={fieldErrors?.generalPhone}>
              <Input
                placeholder="+1 (212) 555-0100"
                value={formData.generalPhone}
                onChange={(e) => handleChange("generalPhone", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          {/* Section 2: Primary Contact */}
          <SectionHeader title="Primary Contact" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FieldWrapper label="Contact Name" error={fieldErrors?.primaryContact}>
              <Input
                placeholder="James Miller"
                value={formData.primaryContact}
                onChange={(e) => handleChange("primaryContact", e.target.value)}
                required
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Contact Email" error={fieldErrors?.contactEmail}>
              <Input
                type="email"
                placeholder="jmiller@flexjet.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Contact Phone (Optional)" error={fieldErrors?.contactPhone}>
              <Input
                placeholder="+1 (212) 555-0184"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          {/* Section 3: Fleet & Routes */}
          <SectionHeader title="Fleet & Coverage" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Aircraft types (comma separated) (Optional)">
              <Input
                placeholder="Challenger 350, Global 7500"
                value={formData.aircraftTypesInput}
                onChange={(e) => handleChange("aircraftTypesInput", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Service routes (comma separated) (Optional)">
              <Input
                placeholder="KTEB ↔ KMIA, KJFK ↔ EGLL"
                value={formData.serviceRoutesInput}
                onChange={(e) => handleChange("serviceRoutesInput", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          {/* Section 4: Operational Metrics & Policy */}
          <SectionHeader title="Performance & Terms" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FieldWrapper label="Reliability (0-5) (Optional)" error={fieldErrors?.reliabilityRating}>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="4.8"
                value={formData.reliability}
                onChange={(e) => handleChange("reliability", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Safety (0-5) (Optional)" error={fieldErrors?.safetyRating}>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="4.9"
                value={formData.safety}
                onChange={(e) => handleChange("safety", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Response speed (Optional)" error={fieldErrors?.responseSpeed}>
              <OptionalSelect
                value={formData.responseSpeed}
                onChange={(value) => handleChange("responseSpeed", value)}
                options={RESPONSE_SPEED_OPTIONS}
                blankLabel="Not rated"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FieldWrapper label="Payment terms (Optional)" error={fieldErrors?.paymentTerms}>
              <OptionalSelect
                value={formData.paymentTerms}
                onChange={(value) => handleChange("paymentTerms", value)}
                options={PAYMENT_TERMS_OPTIONS}
                blankLabel="Not on file"
              />
            </FieldWrapper>
          </div>

          {/* Full width and multi-line, because this field is pasted into
              rather than typed: an operator's policy arrives as a tier per
              line, and a single-line input drops the line breaks on the way
              in. */}
          <FieldWrapper label="Cancellation policy (Optional)" error={fieldErrors?.cancellationPolicy}>
            <DialogTextarea
              rows={5}
              value={formData.cancellationPolicy}
              onChange={(e) => handleChange("cancellationPolicy", e.target.value)}
              placeholder={"Paste the operator's policy here, e.g.\n\n30+ days before departure — 10% of the charter price\n14-30 days — 25%\n72 hours-14 days — 50%\nUnder 72 hours — non-refundable"}
            />
          </FieldWrapper>

          <FieldWrapper label="Notes (Optional)" optional>
            <DialogTextarea
              value={formData.sourcingNotes}
              onChange={(e) => handleChange("sourcingNotes", e.target.value)}
              placeholder="Internal notes visible to brokers only..."
            />
          </FieldWrapper>

          {/* Operator Documents — filed into the operator's vault folder
              (#22) once the operator saves; edited, dated and removed on the
              operator's Documents tab. */}
          {mayFileDocuments ? (
            <FieldWrapper label="Operator documents (Optional)">
              <div className="flex flex-col gap-2 w-full">
                <FileUpload
                  variant="dropzone"
                  kind="document"
                  visibility="PRIVATE"
                  multiple
                  value={documents.map((doc) => doc.fileUrl)}
                  onUploaded={addDocument}
                  onRemove={removeDocument}
                  heading="Upload documents"
                  description="Certificates, insurance, agreements — PDF, Word, Excel or images, up to 25 MB each."
                />
                {documents.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-montserrat text-[12px] text-muted-foreground">File them as</span>
                    <div className="w-56">
                      <CommonSelect
                        value={documentType}
                        onChange={setDocumentType}
                        options={OPERATOR_DOCUMENT_CATEGORIES}
                        className="data-[size=default]:h-9"
                      />
                    </div>
                  </div>
                ) : null}
                <p className="font-montserrat text-[11px] text-muted-foreground">
                  {editingOperator
                    ? "Added to the documents already on file. Set expiry dates on the Documents tab."
                    : "Filed when the operator is saved. Set expiry dates on the Documents tab."}
                </p>
              </div>
            </FieldWrapper>
          ) : null}

          {/* Footer Buttons */}
          <div className="flex items-center justify-start gap-3 pt-3 border-t border-border/40 w-full">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 font-medium text-[13px] gap-1.5"
              onClick={closeAddModal}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation?.isPending || fileDocuments.isPending}
              className="h-9 px-4 font-medium text-[13px] gap-1.5"
            >
              {editingOperator ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {fileDocuments.isPending
                ? "Filing documents…"
                : mutation?.isPending
                ? "Saving…"
                : editingOperator
                  ? "Save Changes"
                  : "Add Operator"}
            </Button>
          </div>
        </form>
    </>
  );
}
