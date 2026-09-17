"use client";

import { useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useOperatorsStore } from "@/store/useOperatorsStore";
import { useCreateOperator, useUpdateOperator } from "@/hooks/operators";
import {
  FILTERABLE_OPERATOR_STATUSES,
  formatOperatorStatus,
} from "@/lib/operator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    email: fieldValue(operator.email),
    phone: fieldValue(operator.phone),
    aircraftTypesInput: list(operator.aircraftTypes),
    serviceRoutesInput: list(operator.serviceRoutes),
    reliability:
      operator.rawReliability === null || operator.rawReliability === undefined
        ? ""
        : String(operator.rawReliability),
    safety: fieldValue(operator.safety),
    responseSpeed: fieldValue(operator.responseSpeed),
    cancellationPolicy: fieldValue(operator.cancellationPolicy),
    paymentTerms: fieldValue(operator.paymentTerms),
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
  const mutation = editingOperator ? update : create;
  const fieldErrors = mutation?.error?.fieldErrors ?? {};

  const [formData, setFormData] = useState(() => initialForm(editingOperator));
  const closeAddModal = onDone;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    const editing = Boolean(editingOperator);
    const optional = (value) => {
      const trimmed = (value ?? "").trim();
      if (trimmed) return trimmed;
      // Absent means "leave it alone", null means "clear it" — the API
      // distinguishes the two, so a create omits and an edit nulls.
      return editing ? null : undefined;
    };

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
      safetyRating: optional(formData.safety),
      responseSpeed: optional(formData.responseSpeed),
      cancellationPolicy: optional(formData.cancellationPolicy),
      paymentTerms: optional(formData.paymentTerms),
      sourcingNotes: optional(formData.sourcingNotes),
    };

    if (editing) {
      update.mutate(
        { id: editingOperator.id, ...payload },
        { onSuccess: closeAddModal },
      );
      return;
    }
    create.mutate(payload, { onSuccess: closeAddModal });
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
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                {/* The enum goes on the wire, the label goes on the screen.
                    These options used to carry value="Active", which matched
                    no enum the API accepts and matched no value the form
                    holds — so the select displayed "Active" for every
                    operator whatever its real status, and picking anything
                    sent a label the API rejected. */}
                {FILTERABLE_OPERATOR_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatOperatorStatus(status)}
                  </option>
                ))}
              </select>
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Home Base">
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
            <FieldWrapper label="Contact Name">
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
                placeholder="4.8"
                value={formData.reliability}
                onChange={(e) => handleChange("reliability", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Safety Rating (Optional)">
              <Input
                placeholder="e.g. ARG/US Platinum"
                value={formData.safety}
                onChange={(e) => handleChange("safety", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Response speed (Optional)">
              <Input
                placeholder="Fast"
                value={formData.responseSpeed}
                onChange={(e) => handleChange("responseSpeed", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <FieldWrapper label="Cancellation policy (Optional)">
              <Input
                placeholder="48 hours Notice"
                value={formData.cancellationPolicy}
                onChange={(e) => handleChange("cancellationPolicy", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Payment terms (Optional)">
              <Input
                placeholder="Net 30"
                value={formData.paymentTerms}
                onChange={(e) => handleChange("paymentTerms", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Notes (Optional)" optional>
            <textarea
              rows={3}
              value={formData.sourcingNotes}
              onChange={(e) => handleChange("sourcingNotes", e.target.value)}
              placeholder="Internal notes visible to brokers only..."
              className="w-full p-2.5 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </FieldWrapper>

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
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-4 font-medium text-[13px] gap-1.5"
            >
              {editingOperator ? <Edit className="size-3.5" /> : <Plus className="size-3.5" />}
              {mutation?.isPending
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
