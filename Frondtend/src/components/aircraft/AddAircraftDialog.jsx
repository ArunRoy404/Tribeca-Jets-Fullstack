"use client";

import { useEffect, useState } from "react";
import { Pencil, X, ChevronDown } from "lucide-react";
import { useAircraftStore } from "@/store/useAircraftStore";
import {
  aircraftTypeSelectOptions,
  aircraftStatusSelectOptions,
  aircraftOperatorSelectOptions,
} from "@/dummyData/aircraft";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FieldWrapper({ label, children }) {
  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      <label className="font-montserrat text-[14px] font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

const initialForm = {
  model: "",
  tail: "",
  category: "Heavy Jet",
  status: "Available",
  operator: "Unassigned",
  capacity: "8",
  rangeNm: "",
  year: "2020",
  notes: "",
};

export default function AddAircraftDialog() {
  const open = useAircraftStore((s) => s.addModalOpen);
  const editingAircraft = useAircraftStore((s) => s.editingAircraft);
  const closeModal = useAircraftStore((s) => s.closeAddModal);
  const addAircraft = useAircraftStore((s) => s.addAircraft);
  const updateAircraft = useAircraftStore((s) => s.updateAircraft);

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (editingAircraft) {
      setFormData({
        model: editingAircraft.model || "",
        tail: editingAircraft.tail || "",
        category: editingAircraft.category || "Heavy Jet",
        status: editingAircraft.status || "Available",
        operator: editingAircraft.operator || "Unassigned",
        capacity: String(editingAircraft.paxCount || parseInt(editingAircraft.capacity) || "8"),
        rangeNm: editingAircraft.rangeNm || "",
        year: String(editingAircraft.year || "2020"),
        notes: editingAircraft.notes || "",
      });
    } else {
      setFormData(initialForm);
    }
  }, [editingAircraft, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.model.trim()) return;

    const payload = {
      model: formData.model.trim(),
      tail: formData.tail.trim().toUpperCase() || "N-TBD",
      category: formData.category,
      status: formData.status,
      operator: formData.operator,
      capacity: `${formData.capacity} pax`,
      paxCount: parseInt(formData.capacity) || 8,
      rangeNm: formData.rangeNm.trim() || "5,000",
      year: parseInt(formData.year) || 2020,
      notes: formData.notes.trim(),
      manufacturer: formData.model.includes("Gulfstream") ? "Gulfstream Aerospace" : "Bombardier Aerospace",
      modelYear: String(formData.year || "2020"),
      maxPassengers: String(formData.capacity || "8"),
      maxRange: `${formData.rangeNm || "5,000"} nm`,
      maxSpeed: "Mach 0.85",
      serviceCeiling: "45,000 ft",
      baggageCapacity: "180 cu ft",
      cabinLength: "45.0 ft",
    };

    if (editingAircraft) {
      updateAircraft(editingAircraft.id, payload);
    } else {
      addAircraft(payload);
    }

    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-8 rounded-2xl flex flex-col gap-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
          <DialogTitle className="font-montserrat font-bold text-[22px] text-foreground">
            {editingAircraft ? "Edit Aircraft" : "Add Aircraft"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
          {/* Row 1: Aircraft Name & Tail Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            <FieldWrapper label="Aircraft Name">
              <Input
                placeholder="Gulfstream G550"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                className="h-12 px-4 text-[14px] font-montserrat rounded-lg border-border"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Tail Number">
              <Input
                placeholder="N780EX"
                value={formData.tail}
                onChange={(e) => handleChange("tail", e.target.value)}
                className="h-12 px-4 text-[14px] font-montserrat rounded-lg border-border"
                required
              />
            </FieldWrapper>
          </div>

          {/* Row 2: Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            <FieldWrapper label="Type">
              <div className="relative w-full">
                <select
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="h-12 px-4 pr-10 appearance-none rounded-lg border border-input bg-background font-montserrat text-[14px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
                >
                  {aircraftTypeSelectOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </FieldWrapper>

            <FieldWrapper label="Status">
              <div className="relative w-full">
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="h-12 px-4 pr-10 appearance-none rounded-lg border border-input bg-background font-montserrat text-[14px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
                >
                  {aircraftStatusSelectOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </FieldWrapper>
          </div>

          {/* Row 3: Operator (Full Width) */}
          <FieldWrapper label="Operator">
            <div className="relative w-full">
              <select
                value={formData.operator}
                onChange={(e) => handleChange("operator", e.target.value)}
                className="h-12 px-4 pr-10 appearance-none rounded-lg border border-input bg-background font-montserrat text-[14px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                {aircraftOperatorSelectOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </FieldWrapper>

          {/* Row 4: Capacity, Range, Year (3 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
            <FieldWrapper label="Capacity">
              <Input
                placeholder="8"
                value={formData.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
                className="h-12 px-4 text-[14px] font-montserrat rounded-lg border-border"
              />
            </FieldWrapper>

            <FieldWrapper label="Range (nm)">
              <Input
                placeholder="Type..."
                value={formData.rangeNm}
                onChange={(e) => handleChange("rangeNm", e.target.value)}
                className="h-12 px-4 text-[14px] font-montserrat rounded-lg border-border"
              />
            </FieldWrapper>

            <FieldWrapper label="Year">
              <Input
                placeholder="2020"
                value={formData.year}
                onChange={(e) => handleChange("year", e.target.value)}
                className="h-12 px-4 text-[14px] font-montserrat rounded-lg border-border"
              />
            </FieldWrapper>
          </div>

          {/* Row 5: Notes */}
          <FieldWrapper label="Notes">
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Type..."
              className="w-full p-4 rounded-lg border border-input bg-background font-montserrat text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </FieldWrapper>

          {/* Footer Buttons (Right Aligned) */}
          <div className="flex items-center justify-end gap-3 pt-4 w-full">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5 font-medium text-[14px] gap-2 rounded-lg"
              onClick={closeModal}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-11 px-6 font-medium text-[14px] gap-2 rounded-lg"
            >
              <Pencil className="size-4" />
              {editingAircraft ? "Save Changes" : "Add Aircraft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
