"use client";

import { useMemo, useState } from "react";
import { Plus, Edit, X } from "lucide-react";
import { useAircraftStore } from "@/store/useAircraftStore";
import { useCreateAircraft, useUpdateAircraft } from "@/hooks/aircraft";
import { useOperators } from "@/hooks/operators";
import { useAirports } from "@/hooks/airports";
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

function FieldWrapper({ label, children, optional }) {
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

const SELECT_CLASS =
  "h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer";

/**
 * Empty, not pre-filled.
 *
 * Every specification starts blank on purpose. The previous version of this
 * form defaulted the capacity to 8, the year to 2020 and derived the
 * manufacturer from whether the model contained the word "Gulfstream" — so
 * every aircraft added carried numbers nobody had entered, and a Falcon was
 * recorded as a Bombardier. Category and status are the exceptions: they are
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
  };
}

/** Blank means "not supplied" — never 0, and never sent at all. */
const optional = (value) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : undefined;
};

/**
 * A blank numeric box must not become 0.
 *
 * `Number('')` is 0, so an untouched Range field would store a real, wrong
 * value. On create the field is simply omitted; on update it is sent as null,
 * which is how the API is told to clear it.
 */
const numeric = (value, { clearable = false } = {}) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return clearable ? null : undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const dateOrNull = (value, { clearable = false } = {}) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return clearable ? null : undefined;
  return trimmed;
};

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

  // Real reference data for both pickers — no hardcoded operator list.
  const { data: operators } = useOperators({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const { data: airports } = useAirports({
    limit: 100,
    sortBy: "icao",
    sortOrder: "asc",
  });

  const [form, setForm] = useState(() => initialForm(editingAircraft));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * Keeps the currently-assigned row in its picker even after it is archived.
   *
   * Both lists fetch live rows only, so editing an aircraft whose operator or
   * home base had since been archived showed an empty select — and saving it
   * either silently unassigned the link or failed with "that operator does not
   * exist" about the one it already had. The stored row is appended, labelled,
   * so the form shows the truth and leaving it alone is a real choice.
   */
  const withCurrent = (rows, currentId, label) => {
    const list = rows ?? [];
    if (!currentId || list.some((row) => row.id === currentId)) return list;
    return [...list, { id: currentId, __archived: true, ...label }];
  };

  const operatorOptions = useMemo(
    () =>
      withCurrent(operators?.data, form.operatorId, {
        name: editingAircraft?.operator,
      }),
    [operators?.data, form.operatorId, editingAircraft?.operator],
  );

  const airportOptions = useMemo(
    () =>
      withCurrent(airports?.data, form.homeBaseId, {
        icao: editingAircraft?.homeBaseIcao,
        name: editingAircraft?.homeBase,
      }),
    [
      airports?.data,
      form.homeBaseId,
      editingAircraft?.homeBaseIcao,
      editingAircraft?.homeBase,
    ],
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    const amenities = form.amenitiesInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    // On edit, a field the user cleared must reach the API as null so it is
    // actually cleared. On create there is nothing to clear, so blanks are
    // omitted entirely.
    const clearable = editing;
    const payload = {
      tailNumber: form.tailNumber.trim().toUpperCase(),
      model: form.model.trim(),
      category: form.category,
      status: form.status,
      manufacturer: editing ? (optional(form.manufacturer) ?? null) : optional(form.manufacturer),

      // "" is the Unassigned / None option, and null is how the API is told so.
      operatorId: form.operatorId || null,
      homeBaseId: form.homeBaseId || null,

      maxPassengers: numeric(form.maxPassengers, { clearable }),
      rangeNm: numeric(form.rangeNm, { clearable }),
      yearBuilt: numeric(form.yearBuilt, { clearable }),

      maxSpeed: editing ? (optional(form.maxSpeed) ?? null) : optional(form.maxSpeed),
      cruiseSpeed: editing ? (optional(form.cruiseSpeed) ?? null) : optional(form.cruiseSpeed),

      serviceCeilingFt: numeric(form.serviceCeilingFt, { clearable }),
      baggageCapacityCuFt: numeric(form.baggageCapacityCuFt, { clearable }),
      cabinLengthFt: numeric(form.cabinLengthFt, { clearable }),
      maxTakeoffWeightLb: numeric(form.maxTakeoffWeightLb, { clearable }),
      emptyWeightLb: numeric(form.emptyWeightLb, { clearable }),
      fuelCapacityGal: numeric(form.fuelCapacityGal, { clearable }),
      takeoffDistanceFt: numeric(form.takeoffDistanceFt, { clearable }),
      landingDistanceFt: numeric(form.landingDistanceFt, { clearable }),

      amenities,

      lastInspectionAt: dateOrNull(form.lastInspectionAt, { clearable }),
      lastAnnualAt: dateOrNull(form.lastAnnualAt, { clearable }),
      nextInspectionDueAt: dateOrNull(form.nextInspectionDueAt, { clearable }),

      notes: editing ? (optional(form.notes) ?? null) : optional(form.notes),
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
          <FieldWrapper label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={SELECT_CLASS}
              required
            >
              <option value="">Choose a category</option>
              {FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {formatAircraftCategory(value)}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={SELECT_CLASS}
            >
              {FILTERABLE_AIRCRAFT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatAircraftStatus(value)}
                </option>
              ))}
            </select>
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
          {/* A real operator from the directory, not a name typed into a box. */}
          <FieldWrapper label="Operator" optional>
            <select
              value={form.operatorId}
              onChange={(e) => set("operatorId", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Unassigned</option>
              {operatorOptions.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                  {operator.__archived ? " (archived)" : ""}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Home Base" optional>
            <select
              value={form.homeBaseId}
              onChange={(e) => set("homeBaseId", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">None</option>
              {airportOptions.map((airport) => (
                <option key={airport.id} value={airport.id}>
                  {airport.icao} — {airport.name}
                  {airport.__archived ? " (archived)" : ""}
                </option>
              ))}
            </select>
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
              placeholder="Mach 0.885 or 310 KTAS"
              value={form.maxSpeed}
              onChange={(e) => set("maxSpeed", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Cruise Speed" optional>
            <Input
              placeholder="Mach 0.80 or 270 KTAS"
              value={form.cruiseSpeed}
              onChange={(e) => set("cruiseSpeed", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <SectionHeader title="Specifications" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FieldWrapper label="Service Ceiling (ft)" optional>
            <Input
              type="number"
              placeholder="51000"
              value={form.serviceCeilingFt}
              onChange={(e) => set("serviceCeilingFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Baggage (cu ft)" optional>
            <Input
              type="number"
              placeholder="226"
              value={form.baggageCapacityCuFt}
              onChange={(e) => set("baggageCapacityCuFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Cabin Length (ft)" optional>
            <Input
              type="number"
              step="0.1"
              placeholder="50.1"
              value={form.cabinLengthFt}
              onChange={(e) => set("cabinLengthFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Max Takeoff Weight (lb)" optional>
            <Input
              type="number"
              placeholder="91000"
              value={form.maxTakeoffWeightLb}
              onChange={(e) => set("maxTakeoffWeightLb", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Empty Weight (lb)" optional>
            <Input
              type="number"
              placeholder="48300"
              value={form.emptyWeightLb}
              onChange={(e) => set("emptyWeightLb", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Fuel Capacity (gal)" optional>
            <Input
              type="number"
              placeholder="6325"
              value={form.fuelCapacityGal}
              onChange={(e) => set("fuelCapacityGal", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Takeoff Distance (ft)" optional>
            <Input
              type="number"
              placeholder="5910"
              value={form.takeoffDistanceFt}
              onChange={(e) => set("takeoffDistanceFt", e.target.value)}
            />
          </FieldWrapper>

          <FieldWrapper label="Landing Distance (ft)" optional>
            <Input
              type="number"
              placeholder="2770"
              value={form.landingDistanceFt}
              onChange={(e) => set("landingDistanceFt", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Amenities" optional>
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
