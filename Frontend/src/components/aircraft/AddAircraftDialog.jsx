"use client";

import { useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useAircraftStore } from "@/store/useAircraftStore";
import { useCreateAircraft, useUpdateAircraft } from "@/hooks/aircraft";
import OperatorPicker from "@/components/operators/OperatorPicker";
import AirportPicker from "@/components/airports/AirportPicker";
import CommonSelect from "@/components/common/CommonSelect";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  FILTERABLE_AIRCRAFT_STATUSES,
  formatAircraftCategory,
  formatAircraftStatus,
} from "@/lib/aircraft";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/common/DatePicker";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import { optionalNumber, optionalText } from "@/lib/form";

function FieldWrapper({ label, children, optional, error }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[12px] font-medium text-foreground flex items-center justify-between">
          <span>{label}</span>
          {optional && (
            <span className="text-muted-foreground font-normal text-[11px]">(Optional)</span>
          )}
        </label>
      )}
      {children}
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

const SELECT_CLASS = "data-[size=default]:h-10";

/**
 * Empty, not pre-filled.
 *
 * Every specification starts blank on purpose. Category and status are
 * closed lists where the first option is a real choice, not a guess.
 */
const EMPTY_FORM = {
  tailNumber: "",
  model: "",
  manufacturer: "",
  category: "",
  status: "AVAILABLE",
  operatorId: "",
  homeBaseId: "",
  maxPassengers: "",
  rangeNm: "",
  yearBuilt: "",
  maxSpeed: "",
  cruiseSpeed: "",
  serviceCeilingFt: "",
  baggageCapacityCuFt: "",
  cabinLengthFt: "",
  maxTakeoffWeightLb: "",
  emptyWeightLb: "",
  fuelCapacityGal: "",
  takeoffDistanceFt: "",
  landingDistanceFt: "",
  amenitiesInput: "",
  lastInspectionAt: "",
  lastAnnualAt: "",
  nextInspectionDueAt: "",
  notes: "",
  exteriorImageUrl: "",
  interiorImageUrl: "",
};

/**
 * Values the row mapper renders as an em dash are display text, not data —
 * they must not be written back into an input as the literal "—".
 */
function fieldValue(value) {
  return !value || value === "—" ? "" : String(value);
}

/** A stored ISO timestamp back into the `YYYY-MM-DD` the date input wants. */
function dateValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

/**
 * Numbers come off the mapper already formatted for display ("6,750 nm"), so
 * the form reads the raw record instead where one exists, and otherwise strips
 * the formatting rather than posting "6,750 nm" back to the API.
 */
function numberValue(value) {
  if (value === null || value === undefined || value === "" || value === "—") {
    return "";
  }
  const digits = String(value).replace(/[^0-9.]/g, "");
  return digits;
}

function initialForm(aircraft) {
  if (!aircraft) return EMPTY_FORM;
  return {
    tailNumber: fieldValue(aircraft.tailNumber),
    model: fieldValue(aircraft.model),
    manufacturer: fieldValue(aircraft.manufacturer),
    // The API speaks enum constants; `rawCategory` is the unmapped one.
    category: aircraft.rawCategory || "",
    status: aircraft.rawStatus || "AVAILABLE",
    operatorId: aircraft.operatorId ?? "",
    homeBaseId: aircraft.homeBaseId ?? "",
    maxPassengers: numberValue(aircraft.rawMaxPassengers),
    rangeNm: numberValue(aircraft.rawRangeNm),
    yearBuilt: numberValue(aircraft.yearBuilt),
    maxSpeed: fieldValue(aircraft.maxSpeed),
    cruiseSpeed: fieldValue(aircraft.cruiseSpeed),
    serviceCeilingFt: numberValue(aircraft.serviceCeiling),
    baggageCapacityCuFt: numberValue(aircraft.baggageCapacity),
    cabinLengthFt: numberValue(aircraft.cabinLength),
    maxTakeoffWeightLb: numberValue(aircraft.maxTakeoffWeight),
    emptyWeightLb: numberValue(aircraft.emptyWeight),
    fuelCapacityGal: numberValue(aircraft.fuelCapacity),
    takeoffDistanceFt: numberValue(aircraft.takeoffDistance),
    landingDistanceFt: numberValue(aircraft.landingDistance),
    amenitiesInput: Array.isArray(aircraft.amenities)
      ? aircraft.amenities.join(", ")
      : "",
    lastInspectionAt: dateValue(aircraft.lastInspectionAt),
    lastAnnualAt: dateValue(aircraft.lastAnnualAt),
    nextInspectionDueAt: dateValue(aircraft.nextInspectionDueAt),
    notes: aircraft.notes || "",
    exteriorImageUrl: aircraft.exteriorImageUrl ?? "",
    interiorImageUrl: aircraft.interiorImageUrl ?? "",
  };
}

export default function AddAircraftDialog() {
  const addModalOpen = useAircraftStore((s) => s.addModalOpen);
  const editingAircraft = useAircraftStore((s) => s.editingAircraft);
  const closeAddModal = useAircraftStore((s) => s.closeAddModal);

  return (
    <Dialog open={addModalOpen} onOpenChange={(next) => !next && closeAddModal()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        {/*
          Keyed so the form remounts with fresh state whenever the dialog opens
          on a different aircraft — React's own answer to "reset state when a
          prop changes". An effect calling setState renders once with the
          previous aircraft's values before correcting itself.
        */}
        {addModalOpen && (
          <AircraftForm
            key={editingAircraft?.id ?? "new"}
            editingAircraft={editingAircraft}
            onDone={closeAddModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AircraftForm({ editingAircraft, onDone }) {
  const { mutate: createAircraft, isPending: isCreating } = useCreateAircraft();
  const { mutate: updateAircraft, isPending: isUpdating } = useUpdateAircraft();
  const editing = Boolean(editingAircraft);

  const [form, setForm] = useState(() => initialForm(editingAircraft));
  const [categoryError, setCategoryError] = useState("");
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const categoryOptions = FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => ({
    value,
    label: formatAircraftCategory(value),
  }));

  const statusOptions = FILTERABLE_AIRCRAFT_STATUSES.map((value) => ({
    value,
    label: formatAircraftStatus(value),
  }));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.category) {
      setCategoryError("Please choose an aircraft category");
      return;
    }
    setCategoryError("");

    const amenities = form.amenitiesInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    // On edit, a field the user cleared must reach the API as null so it is
    // actually cleared. On create there is nothing to clear, so blanks are
    // omitted entirely. `lib/form` makes that call from `editing`.
    const payload = {
      tailNumber: form.tailNumber.trim().toUpperCase(),
      model: form.model.trim(),
      category: form.category,
      status: form.status,
      manufacturer: optionalText(form.manufacturer, { editing }),

      // "" is Unassigned / None, and null is how the API clears the foreign key.
      operatorId: form.operatorId || null,
      homeBaseId: form.homeBaseId || null,

      maxPassengers: optionalNumber(form.maxPassengers, { editing }),
      rangeNm: optionalNumber(form.rangeNm, { editing }),
      yearBuilt: optionalNumber(form.yearBuilt, { editing }),

      maxSpeed: optionalText(form.maxSpeed, { editing }),
      cruiseSpeed: optionalText(form.cruiseSpeed, { editing }),

      serviceCeilingFt: optionalNumber(form.serviceCeilingFt, { editing }),
      baggageCapacityCuFt: optionalNumber(form.baggageCapacityCuFt, { editing }),
      cabinLengthFt: optionalNumber(form.cabinLengthFt, { editing }),
      maxTakeoffWeightLb: optionalNumber(form.maxTakeoffWeightLb, { editing }),
      emptyWeightLb: optionalNumber(form.emptyWeightLb, { editing }),
      fuelCapacityGal: optionalNumber(form.fuelCapacityGal, { editing }),
      takeoffDistanceFt: optionalNumber(form.takeoffDistanceFt, { editing }),
      landingDistanceFt: optionalNumber(form.landingDistanceFt, { editing }),

      amenities,

      lastInspectionAt: optionalText(form.lastInspectionAt, { editing }),
      lastAnnualAt: optionalText(form.lastAnnualAt, { editing }),
      nextInspectionDueAt: optionalText(form.nextInspectionDueAt, { editing }),

      notes: optionalText(form.notes, { editing }),

      exteriorImageUrl: optionalText(form.exteriorImageUrl, { editing }),
      interiorImageUrl: optionalText(form.interiorImageUrl, { editing }),
    };

    if (editing) {
      updateAircraft({ id: editingAircraft.id, ...payload }, { onSuccess: onDone });
    } else {
      createAircraft(payload, { onSuccess: onDone });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <>
      <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
          {editing ? "Edit Aircraft" : "Add Aircraft"}
        </DialogTitle>
        <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
          {editing
            ? "Update this airframe's details. Only what you change is sent."
            : "Tail number, model and category are all that is required — leave a specification blank rather than guessing it."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <SectionHeader title="Identity" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FieldWrapper label="Tail Number">
            <Input
              placeholder="N780EX"
              value={form.tailNumber}
              onChange={(e) => set("tailNumber", e.target.value)}
              required
            />
          </FieldWrapper>

          <FieldWrapper label="Aircraft Model">
            <Input
              placeholder="Gulfstream G550"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              required
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Category" error={categoryError}>
            <CommonSelect
              value={form.category}
              onChange={(value) => {
                set("category", value);
                if (value) setCategoryError("");
              }}
              options={categoryOptions}
              placeholder="Choose a category"
              className={SELECT_CLASS}
            />
          </FieldWrapper>

          <FieldWrapper label="Status">
            <CommonSelect
              value={form.status}
              onChange={(value) => set("status", value)}
              options={statusOptions}
              className={SELECT_CLASS}
            />
          </FieldWrapper>

          {/* Blank rather than guessed from the model name. */}
          <FieldWrapper label="Manufacturer" optional>
            <Input
              placeholder="Gulfstream Aerospace"
              value={form.manufacturer}
              onChange={(e) => set("manufacturer", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <SectionHeader title="Assignment" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Shared RecordPicker wrapper: live search, server paged */}
          <FieldWrapper label="Operator" optional>
            <OperatorPicker
              value={form.operatorId}
              onChange={(value) => set("operatorId", value || "")}
              placeholder="Unassigned"
            />
          </FieldWrapper>

          {/* Shared RecordPicker wrapper: live search, server paged */}
          <FieldWrapper label="Home Base" optional>
            <AirportPicker
              value={form.homeBaseId}
              onChange={(value) => set("homeBaseId", value || "")}
              placeholder="None"
            />
          </FieldWrapper>
        </div>

        <SectionHeader title="Capacity & Performance" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Max Passengers" optional>
            <Input
              type="number"
              min="1"
              placeholder="14"
              value={form.maxPassengers}
              onChange={(e) => set("maxPassengers", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Range (nm)" optional>
            <Input
              type="number"
              min="1"
              placeholder="6750"
              value={form.rangeNm}
              onChange={(e) => set("rangeNm", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Year Built" optional>
            <Input
              type="number"
              min="1950"
              max="2100"
              placeholder="2019"
              value={form.yearBuilt}
              onChange={(e) => set("yearBuilt", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Free text, because jets are quoted in Mach and turboprops in
              knots — a number alone would be shown under the wrong unit. */}
          <FieldWrapper label="Max Speed" optional>
            <Input
              placeholder="Mach 0.885"
              value={form.maxSpeed}
              onChange={(e) => set("maxSpeed", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Cruise Speed" optional>
            <Input
              placeholder="Mach 0.85"
              value={form.cruiseSpeed}
              onChange={(e) => set("cruiseSpeed", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Service Ceiling (ft)" optional>
            <Input
              type="number"
              min="0"
              placeholder="51000"
              value={form.serviceCeilingFt}
              onChange={(e) => set("serviceCeilingFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Baggage Capacity (cu ft)" optional>
            <Input
              type="number"
              min="0"
              placeholder="195"
              value={form.baggageCapacityCuFt}
              onChange={(e) => set("baggageCapacityCuFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Cabin Length (ft)" optional>
            <Input
              type="number"
              step="0.1"
              min="0"
              placeholder="50.1"
              value={form.cabinLengthFt}
              onChange={(e) => set("cabinLengthFt", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FieldWrapper label="Max Takeoff Weight (lb)" optional>
            <Input
              type="number"
              min="0"
              placeholder="91000"
              value={form.maxTakeoffWeightLb}
              onChange={(e) => set("maxTakeoffWeightLb", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Empty Weight (lb)" optional>
            <Input
              type="number"
              min="0"
              placeholder="48300"
              value={form.emptyWeightLb}
              onChange={(e) => set("emptyWeightLb", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Fuel Capacity (gal)" optional>
            <Input
              type="number"
              min="0"
              placeholder="6018"
              value={form.fuelCapacityGal}
              onChange={(e) => set("fuelCapacityGal", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Takeoff Distance (ft)" optional>
            <Input
              type="number"
              min="0"
              placeholder="5910"
              value={form.takeoffDistanceFt}
              onChange={(e) => set("takeoffDistanceFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Landing Distance (ft)" optional>
            <Input
              type="number"
              min="0"
              placeholder="2770"
              value={form.landingDistanceFt}
              onChange={(e) => set("landingDistanceFt", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Cabin Amenities" optional>
          <Input
            placeholder="WiFi, Full Galley, Lie-flat Seats"
            value={form.amenitiesInput}
            onChange={(e) => set("amenitiesInput", e.target.value)}
          />
          <p className="font-montserrat text-[11px] text-muted-foreground">
            Comma separated. The list is replaced by what you type here.
          </p>
        </FieldWrapper>

        <SectionHeader title="Maintenance" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Last Inspection" optional>
            <DatePicker
              value={form.lastInspectionAt}
              onChange={(value) => set("lastInspectionAt", value)}
              placeholder="Choose Date"
            />
          </FieldWrapper>

          <FieldWrapper label="Last Annual" optional>
            <DatePicker
              value={form.lastAnnualAt}
              onChange={(value) => set("lastAnnualAt", value)}
              placeholder="Choose Date"
            />
          </FieldWrapper>

          <FieldWrapper label="Next Inspection Due" optional>
            <DatePicker
              value={form.nextInspectionDueAt}
              onChange={(value) => set("nextInspectionDueAt", value)}
              placeholder="Choose Date"
            />
          </FieldWrapper>
        </div>

        {/* Uploaded before the aircraft exists — the upload returns a URL and
            the save stores it, which is what lets a new tail get its photos
            in the same form that creates it. PUBLIC: fleet photos go on
            quotes and itineraries every broker sends. */}
        <SectionHeader title="Photos" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FieldWrapper label="Exterior" optional>
            <FileUpload
              variant="dropzone"
              kind="image"
              visibility="PUBLIC"
              accept={ACCEPT.image}
              heading="Drag & drop exterior photo"
              description="or click to upload"
              value={form.exteriorImageUrl}
              library
              onUploaded={(data) => set("exteriorImageUrl", data?.url ?? "")}
              onRemove={() => set("exteriorImageUrl", "")}
            />
          </FieldWrapper>

          <FieldWrapper label="Interior" optional>
            <FileUpload
              variant="dropzone"
              kind="image"
              visibility="PUBLIC"
              accept={ACCEPT.image}
              heading="Drag & drop interior photo"
              description="or click to upload"
              value={form.interiorImageUrl}
              library
              onUploaded={(data) => set("interiorImageUrl", data?.url ?? "")}
              onRemove={() => set("interiorImageUrl", "")}
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Notes" optional>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="What the desk should remember when quoting this tail."
            className="w-full p-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
          />
        </FieldWrapper>

        <div className="flex items-center justify-end gap-3 pt-2 w-full border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 font-medium text-[13px] gap-2"
            onClick={onDone}
            disabled={isPending}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-2"
            disabled={isPending}
          >
            {editing ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {isPending ? "Saving…" : editing ? "Save Changes" : "Add Aircraft"}
          </Button>
        </div>
      </form>
    </>
  );
}
