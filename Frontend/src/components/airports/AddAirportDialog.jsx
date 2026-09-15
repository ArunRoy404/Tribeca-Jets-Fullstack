"use client";

import { useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useAirportsStore } from "@/store/useAirportsStore";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormField from "@/components/trips/FormField";
import { useCreateAirport, useUpdateAirport } from "@/hooks/airports";

const FIELD_CLASS = "h-12 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[14px] text-foreground mb-1.5";

const EMPTY_FORM = {
  icao: "",
  iata: "",
  name: "",
  city: "",
  state: "",
  country: "USA",
  latitude: "",
  longitude: "",
  longestRunwayFt: "",
  assignedFbo: "",
  notes: "",
};

/**
 * Optional text fields are sent as null when cleared and omitted when never
 * filled in, because the API distinguishes the two: absent means "leave it
 * alone", null means "clear it".
 */
function optional(value, { editing }) {
  const trimmed = (value ?? "").trim();
  if (trimmed) return trimmed;
  return editing ? null : undefined;
}

function optionalNumber(value, { editing }) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return editing ? null : undefined;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
}

function initialForm(airport) {
  if (!airport) return EMPTY_FORM;
  return {
    icao: airport.icao || "",
    iata: airport.iata || "",
    name: airport.name || "",
    city: airport.city || "",
    state: airport.state || "",
    country: airport.country || "USA",
    latitude: airport.latitude ?? "",
    longitude: airport.longitude ?? "",
    longestRunwayFt: airport.longestRunwayFt ?? "",
    // The row renders an em dash for an airport with no FBO; that is a display
    // value, not one to put back into the field.
    assignedFbo: airport.assignedFbo && airport.assignedFbo !== "\u2014" ? airport.assignedFbo : "",
    notes: airport.notes || "",
  };
}

export default function AddAirportDialog() {
  const open = useAirportsStore((s) => s.addModalOpen);
  const editingAirport = useAirportsStore((s) => s.editingAirport);
  const closeModal = useAirportsStore((s) => s.closeAddModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 gap-5 max-h-[90vh] overflow-y-auto">
        {/*
          Keyed so the form remounts with fresh state whenever the dialog opens
          on a different airport. React's own answer to "reset state when a prop
          changes" — an effect calling setState would work, but it renders once
          with the previous airport's values before correcting itself.
        */}
        {open && (
          <AirportForm
            key={editingAirport?.id ?? "new"}
            editingAirport={editingAirport}
            onDone={closeModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AirportForm({ editingAirport, onDone }) {
  const create = useCreateAirport();
  const update = useUpdateAirport();

  const editing = Boolean(editingAirport);
  const mutation = editing ? update : create;
  const fieldErrors = mutation?.error?.fieldErrors ?? {};

  const [formData, setFormData] = useState(() => initialForm(editingAirport));

  const handleClose = onDone;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mirrors the API exactly: ICAO, name, city, country, both coordinates and
    // the runway length. IATA, state, FBO and notes are genuinely optional —
    // many airports have no IATA code and most countries have no state, so
    // requiring them would only produce invented data.
    if (!formData.icao.trim() || !formData.name.trim()) return;

    const payload = {
      icao: formData.icao.trim().toUpperCase(),
      iata: optional(formData.iata.toUpperCase(), { editing }),
      name: formData.name.trim(),
      city: formData.city.trim(),
      state: optional(formData.state.toUpperCase(), { editing }),
      country: formData.country.trim(),
      latitude: optionalNumber(String(formData.latitude), { editing }),
      longitude: optionalNumber(String(formData.longitude), { editing }),
      longestRunwayFt: optionalNumber(String(formData.longestRunwayFt), { editing }),
      assignedFbo: optional(formData.assignedFbo, { editing }),
      // Previously stamped with a hardcoded sentence when left blank, which
      // wrote "Primary departure airport for NYC clients." onto airports
      // nowhere near New York.
      notes: optional(formData.notes, { editing }),
    };

    if (editing) {
      update.mutate({ id: editingAirport.id, ...payload }, { onSuccess: handleClose });
      return;
    }
    create.mutate(payload, { onSuccess: handleClose });
  };

  return (
    <>
        {/* Header */}
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              {editing ? "Edit Airport" : "Add Airport"}
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
            <FormField label="ICAO" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full" error={fieldErrors?.icao}>
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. KTEB"
                value={formData.icao}
                onChange={(e) => handleChange("icao", e.target.value)}
                required
              />
            </FormField>
            <FormField label="IATA (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full" error={fieldErrors?.iata}>
              <Input
                className={FIELD_CLASS}
                placeholder="e.g. TEB"
                value={formData.iata}
                onChange={(e) => handleChange("iata", e.target.value)}
              />
            </FormField>
          </div>

          {/* Row 2: Airport Name */}
          <FormField label="Airport Name" labelClassName={LABEL_CLASS} className="w-full" error={fieldErrors?.name}>
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
            <FormField label="State (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
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
                required
              />
            </FormField>
            <FormField label="Longitude" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full">
              <Input
                className={FIELD_CLASS}
                placeholder="-74.0613"
                value={formData.longitude}
                onChange={(e) => handleChange("longitude", e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Row 5: FBO & longest runway */}
          <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
            <FormField label="FBO (Optional)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full" error={fieldErrors?.assignedFbo}>
              <Input
                className={FIELD_CLASS}
                placeholder="Type..."
                value={formData.assignedFbo}
                onChange={(e) => handleChange("assignedFbo", e.target.value)}
              />
            </FormField>
            {/* The table has had a "Longest Runway" column all along with no
                field behind it, so it rendered blank for every airport. */}
            <FormField label="Longest Runway (ft)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0 w-full" error={fieldErrors?.longestRunwayFt}>
              <Input
                className={FIELD_CLASS}
                placeholder="7000"
                inputMode="numeric"
                value={formData.longestRunwayFt}
                onChange={(e) => handleChange("longestRunwayFt", e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Notes (Optional)" labelClassName={LABEL_CLASS} className="w-full" error={fieldErrors?.notes}>
            <Input
              className={FIELD_CLASS}
              placeholder="Curfews, slot restrictions, customs hours..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </FormField>

          {/* Server-side refusals — a duplicate ICAO, a role without write
              access — arrive as a message rather than a field error. */}
          {mutation?.error && !Object.keys(fieldErrors).length && (
            <p className="font-montserrat text-[12px] text-destructive">
              {mutation.error.message}
            </p>
          )}

          {/* Footer Buttons */}
          <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
            <Button type="button" variant="outline" className="gap-2 px-4" onClick={handleClose}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2 px-4" disabled={mutation?.isPending}>
              {editing ? <Edit className="size-4" /> : <Plus className="size-4" />}
              {mutation?.isPending
                ? "Saving…"
                : editingAirport
                  ? "Save Changes"
                  : "Add Airport"}
            </Button>
          </div>
        </form>
    </>
  );
}
