"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useOperatorsStore } from "@/store/useOperatorsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FieldWrapper({ label, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[12px] font-medium text-foreground flex items-center justify-between">
          <span>{label}</span>
          {optional && <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>}
        </label>
      )}
      {children}
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

const initialForm = {
  name: "",
  status: "Active",
  homeBase: "",
  website: "",
  generalEmail: "",
  generalPhone: "",
  primaryContact: "",
  email: "",
  phone: "",
  aircraftTypesInput: "",
  serviceRoutesInput: "",
  reliability: "4.8",
  safety: "4.9",
  responseSpeed: "Fast",
  cancellationPolicy: "48 hours Notice",
  sourcingNotes: "",
};

export default function AddOperatorDialog() {
  const addModalOpen = useOperatorsStore((s) => s.addModalOpen);
  const editingOperator = useOperatorsStore((s) => s.editingOperator);
  const closeAddModal = useOperatorsStore((s) => s.closeAddModal);
  const addOperator = useOperatorsStore((s) => s.addOperator);
  const updateOperator = useOperatorsStore((s) => s.updateOperator);

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (editingOperator) {
      setFormData({
        name: editingOperator.name || "",
        status: editingOperator.status || "Active",
        homeBase: editingOperator.homeBase || "",
        website: editingOperator.website || "",
        generalEmail: editingOperator.generalEmail || editingOperator.email || "",
        generalPhone: editingOperator.generalPhone || editingOperator.phone || "",
        primaryContact: editingOperator.primaryContact || "",
        email: editingOperator.email || "",
        phone: editingOperator.phone || "",
        aircraftTypesInput: Array.isArray(editingOperator.aircraftTypes)
          ? editingOperator.aircraftTypes.join(", ")
          : editingOperator.aircraftTypes || "",
        serviceRoutesInput: Array.isArray(editingOperator.serviceRoutes)
          ? editingOperator.serviceRoutes.join(", ")
          : editingOperator.serviceRoutes || "",
        reliability: String(editingOperator.reliability || "4.8"),
        safety: String(editingOperator.safety || "4.9"),
        responseSpeed: editingOperator.responseSpeed || "Fast",
        cancellationPolicy: editingOperator.cancellationPolicy || "48 hours Notice",
        sourcingNotes: editingOperator.sourcingNotes || "",
      });
    } else {
      setFormData(initialForm);
    }
  }, [editingOperator, addModalOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const aircraftTypes = formData.aircraftTypesInput
      ? formData.aircraftTypesInput.split(",").map((t) => t.trim()).filter(Boolean)
      : ["Global 7500"];

    const serviceRoutes = formData.serviceRoutesInput
      ? formData.serviceRoutesInput.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    const payload = {
      name: formData.name.trim(),
      status: formData.status,
      homeBase: formData.homeBase.trim() || "Teterboro, NJ",
      website: formData.website.trim(),
      generalEmail: formData.generalEmail.trim(),
      generalPhone: formData.generalPhone.trim(),
      primaryContact: formData.primaryContact.trim() || "Operations Dispatch",
      email: formData.email.trim() || formData.generalEmail.trim() || "ops@operator.com",
      phone: formData.phone.trim() || formData.generalPhone.trim() || "+1 (555) 0100",
      aircraftTypes,
      serviceRoutes,
      reliability: parseFloat(formData.reliability) || 4.8,
      safety: formData.safety,
      responseSpeed: formData.responseSpeed,
      cancellationPolicy: formData.cancellationPolicy,
      sourcingNotes: formData.sourcingNotes.trim(),
    };

    if (editingOperator) {
      updateOperator(editingOperator.id, payload);
    } else {
      addOperator(payload);
    }

    closeAddModal();
  };

  return (
    <Dialog open={addModalOpen} onOpenChange={(open) => !open && closeAddModal()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
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
            <FieldWrapper label="Operator name">
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
                <option value="Active">Active</option>
                <option value="Preferred">Preferred</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Home Base">
              <Input
                placeholder="Cleveland, OH"
                value={formData.homeBase}
                onChange={(e) => handleChange("homeBase", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Website" optional>
              <Input
                placeholder="www.flexjet.com"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="General email">
              <Input
                type="email"
                placeholder="ops@flexjet.com"
                value={formData.generalEmail}
                onChange={(e) => handleChange("generalEmail", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="General phone">
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
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Contact Email">
              <Input
                type="email"
                placeholder="jmiller@flexjet.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Contact Phone">
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
            <FieldWrapper label="Aircraft types (comma separated)">
              <Input
                placeholder="Challenger 350, Global 7500"
                value={formData.aircraftTypesInput}
                onChange={(e) => handleChange("aircraftTypesInput", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Service routes (comma separated)">
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
            <FieldWrapper label="Reliability (0-5)">
              <Input
                placeholder="4.8"
                value={formData.reliability}
                onChange={(e) => handleChange("reliability", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Safety (0-5)">
              <Input
                placeholder="4.9"
                value={formData.safety}
                onChange={(e) => handleChange("safety", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Response speed">
              <Input
                placeholder="Fast"
                value={formData.responseSpeed}
                onChange={(e) => handleChange("responseSpeed", e.target.value)}
                className="h-10 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Cancellation policy">
            <Input
              placeholder="48 hours Notice"
              value={formData.cancellationPolicy}
              onChange={(e) => handleChange("cancellationPolicy", e.target.value)}
              className="h-10 text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <FieldWrapper label="Notes" optional>
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
              {editingOperator ? "Save Changes" : "Add Operator"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
