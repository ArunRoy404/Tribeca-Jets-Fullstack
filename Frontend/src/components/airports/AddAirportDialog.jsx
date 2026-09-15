"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useAirportsStore } from "@/store/useAirportsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";

const FIELD_CLASS = "h-12 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[14px] text-foreground mb-1.5";

const initialForm = {
  icao: "",
  iata: "",
  name: "",
  city: "",
  state: "",
  country: "USA",
  latitude: "",
  longitude: "",
  assignedFbo: "",
};

export default function AddAirportDialog() {
  const open = useAirportsStore((s) => s.addModalOpen);
  const editingAirport = useAirportsStore((s) => s.editingAirport);
  const closeModal = useAirportsStore((s) => s.closeAddModal);
  const addAirport = useAirportsStore((s) => s.addAirport);
  const updateAirport = useAirportsStore((s) => s.updateAirport);

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (editingAirport) {
      setFormData({
        icao: editingAirport.icao || "",
        iata: editingAirport.iata || "",
        name: editingAirport.name || "",
        city: editingAirport.city || "",
        state: editingAirport.state || "",
        country: editingAirport.country || "USA",
        latitude: editingAirport.latitude || "",
        longitude: editingAirport.longitude || "",
        assignedFbo: editingAirport.assignedFbo || "",
      });
    } else {
      setFormData(initialForm);
    }
  }, [editingAirport, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setFormData(initialForm);
    closeModal();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.icao.trim() || !formData.name.trim()) return;

    const payload = {
      icao: formData.icao.trim().toUpperCase(),
      iata: formData.iata.trim().toUpperCase(),
      name: formData.name.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase(),
      country: formData.country.trim(),
      latitude: formData.latitude.trim() || "40.8508",
      longitude: formData.longitude.trim() || "-74.0613",
      assignedFbo: formData.assignedFbo.trim() || "Signature Flight Support",
      notes: editingAirport?.notes || "Primary departure airport for NYC clients.",
    };

    if (editingAirport) {
      updateAirport(editingAirport.id, payload);
    } else {
      addAirport(payload);
    }

    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              {editingAirport ? "Edit Airport" : "Add Airport"}
            </DialogTitle>
            <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
              {editingAirport
                ? "Update airport location and assigned FBO details"
                : "Register a new airport into the private aviation database"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Row 1: ICAO & IATA */}
          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="ICAO" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. KTEB"
                value={formData.icao}
                onChange={(e) => handleChange("icao", e.target.value)}
                required
              />
            </FormField>
            <FormField label="IATA" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. TEB"
                value={formData.iata}
                onChange={(e) => handleChange("iata", e.target.value)}
              />
            </FormField>
          </div>

          {/* Row 2: Airport Name */}
          <FormField label="Airport Name" labelClassName={LABEL_CLASS} className="w-full">
            <Input
              className={FIELD_CLASS}
              placeholder="Teterboro Airport"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </FormField>

          {/* Row 3: City, State, Country */}
          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="City" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="Type..."
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                required
              />
            </FormField>
            <FormField label="State" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="Type..."
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </FormField>
            <FormField label="Country" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="USA"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Row 4: Latitude & Longitude */}
          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="Latitude" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="40.8508"
                value={formData.latitude}
                onChange={(e) => handleChange("latitude", e.target.value)}
              />
            </FormField>
            <FormField label="Longitude" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="-74.0613"
                value={formData.longitude}
                onChange={(e) => handleChange("longitude", e.target.value)}
              />
            </FormField>
          </div>

          {/* Row 5: FBO */}
          <FormField label="FBO" labelClassName={LABEL_CLASS} className="w-full">
            <Input
              className={FIELD_CLASS}
              placeholder="Type..."
              value={formData.assignedFbo}
              onChange={(e) => handleChange("assignedFbo", e.target.value)}
            />
          </FormField>

          {/* Footer Buttons */}
          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={handleClose}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4">
              {editingAirport ? <Edit className="size-4" /> : <Plus className="size-4" />}
              {editingAirport ? "Save Changes" : "Add Airport"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
