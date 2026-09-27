"use client";

import { useMemo, useState } from "react";
import { FileText, X, Clock } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { useCreateItinerary, useUpdateItinerary } from "@/hooks/itineraries";
import { useTrips, useTrip } from "@/hooks/trips";
import { toTripRow, formatTripStatus } from "@/lib/trip";
import { displayName } from "@/lib/client";
import { formatCalendarDate } from "@/lib/date";
import { formatTime24 } from "@/lib/time";
import { optionalText } from "@/lib/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DetailTabNav from "@/components/common/DetailTabNav";
import TribecaLetterhead from "@/components/common/TribecaLetterhead";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import ItineraryPreview from "@/components/itineraries/ItineraryPreview";
import { cn } from "@/lib/utils";

function FieldWrapper({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

/** No `CommonTimePicker` exists yet — this is the first field that needs one,
 * so it stays local rather than becoming a shared component nobody else uses. */
function TimeField({ label, value, onChange }) {
  return (
    <FieldWrapper label={label}>
      <div className="relative">
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background pl-3 pr-9 font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple"
        />
        <Clock className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </FieldWrapper>
  );
}

const TABS = [
  { id: "form", label: "Form" },
  { id: "preview", label: "Preview" },
];

/** "N780EX · Gulfstream G550", the free-text description, or a dash. */
function aircraftLabel(tripLike) {
  if (tripLike?.aircraft) return [tripLike.aircraft.tailNumber, tripLike.aircraft.model].filter(Boolean).join(" · ") || "—";
  return tripLike?.aircraftDescription || "—";
}

/** The live preview while building against a freshly-picked trip (its full
 * detail, legs and passengers included — the list picker's rows do not carry
 * them). Nothing here is stored; it is only what the saved document would
 * show, built from the same fields the API itself would compute. */
function previewFromTripDetail(trip, form) {
  const legs = trip?.legs ?? [];
  const first = legs[0] ?? null;
  const last = legs.length ? legs[legs.length - 1] : null;
  return {
    tripReference: trip?.reference !== undefined && trip?.reference !== null ? `TJ-${trip.reference}` : "New Itinerary",
    client: trip?.client ? displayName(trip.client) : "—",
    originCode: first?.originAirport?.icao ?? "—",
    destinationCode: last?.destinationAirport?.icao ?? "—",
    departureDateLabel: first?.departureDate ? formatCalendarDate(first.departureDate) : "—",
    departureTime: first?.departureTime ?? "—",
    arrivalTimeLabel: form.arrivalTime ? formatTime24(form.arrivalTime) : "—",
    aircraft: aircraftLabel(trip),
    aircraftTail: trip?.aircraft?.tailNumber ?? "—",
    operator: trip?.operator?.name ?? "—",
    flightTime: form.flightTime || "—",
    miles: form.miles || "—",
    passengers: trip?.passengers ?? [],
    catering: form.catering || "—",
    groundTransport: form.groundTransport || "—",
    // The airport's own assigned-FBO default is not carried on the trip
    // picker's fetch, so an untyped override shows a dash here rather than a
    // guess — it renders correctly once the document is saved and reopened.
    departureFbo: form.departureFbo || "—",
    arrivalFbo: form.arrivalFbo || "—",
    tripStatus: formatTripStatus(trip?.status),
    exteriorImageUrl: form.exteriorImageUrl || trip?.aircraft?.exteriorImageUrl || null,
    interiorImageUrl: form.interiorImageUrl || trip?.aircraft?.interiorImageUrl || null,
  };
}

/** The live preview while editing an existing document — `editingItinerary`
 * already carries every trip-derived field flattened onto it (the API's own
 * response shape), so it needs no second trip fetch. */
function previewFromItinerary(itinerary, form) {
  return {
    tripReference: itinerary?.tripReference ?? "—",
    client: itinerary?.client ? displayName(itinerary.client) : "—",
    originCode: itinerary?.originAirport?.icao ?? "—",
    destinationCode: itinerary?.destinationAirport?.icao ?? "—",
    departureDateLabel: itinerary?.departureDate ? formatCalendarDate(itinerary.departureDate) : "—",
    departureTime: itinerary?.departureTime ?? "—",
    arrivalTimeLabel: form.arrivalTime ? formatTime24(form.arrivalTime) : "—",
    aircraft: aircraftLabel(itinerary),
    aircraftTail: itinerary?.aircraft?.tailNumber ?? "—",
    operator: itinerary?.operator?.name ?? "—",
    flightTime: form.flightTime || "—",
    miles: form.miles || "—",
    passengers: itinerary?.passengers ?? [],
    catering: form.catering || "—",
    groundTransport: form.groundTransport || "—",
    // A blank override still falls back to the record's own effective value —
    // which itself already resolved to the airport default when it was loaded.
    departureFbo: form.departureFbo || itinerary?.departureFbo || "—",
    arrivalFbo: form.arrivalFbo || itinerary?.arrivalFbo || "—",
    tripStatus: formatTripStatus(itinerary?.tripStatus),
    exteriorImageUrl: form.exteriorImageUrl || itinerary?.exteriorImageUrl || null,
    interiorImageUrl: form.interiorImageUrl || itinerary?.interiorImageUrl || null,
  };
}

/** Add or edit a trip's passenger document. Mounted only while `open`, and
 * keyed by the record being edited (`ItineraryForm` below), so a fresh open
 * always starts from the right initial state without an effect racing the
 * first render. */
export default function BuildItineraryDialog() {
  const open = useItinerariesStore((s) => s.buildModalOpen);
  const editingItinerary = useItinerariesStore((s) => s.editingItinerary);
  const closeModal = useItinerariesStore((s) => s.closeBuildModal);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent
        showCloseButton={false}
        className="w-[97vw] h-[94vh] max-w-none sm:max-w-none p-0 gap-0 flex flex-col overflow-hidden rounded-xl"
      >
        {open && <ItineraryForm key={editingItinerary?.id ?? "new"} itinerary={editingItinerary} onDone={closeModal} />}
      </DialogContent>
    </Dialog>
  );
}

function initialForm(itinerary) {
  return {
    linkedTripId: itinerary?.tripId ?? "",
    logoUrl: itinerary?.logoUrl || "",
    arrivalTime: itinerary?.arrivalTime || "",
    flightTime: itinerary?.flightTime || "",
    miles: itinerary?.miles || "",
    departureFbo: itinerary?.departureFboOverride || "",
    arrivalFbo: itinerary?.arrivalFboOverride || "",
    operatorItineraryUrl: itinerary?.operatorItineraryUrl || "",
    operatorItineraryText: itinerary?.operatorItineraryText || "",
    exteriorImage: itinerary?.exteriorImageOverride || "",
    interiorImage: itinerary?.interiorImageOverride || "",
    catering: itinerary?.catering || "",
    groundTransport: itinerary?.groundTransport || "",
    notes: itinerary?.notes || "",
  };
}

function ItineraryForm({ itinerary, onDone }) {
  const isEditing = Boolean(itinerary);
  const [activeTab, setActiveTab] = useState("form");
  const [form, setForm] = useState(() => initialForm(itinerary));
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Trips to build from, for the picker — only while creating. The full
  // detail (legs, passengers) is fetched separately once one is chosen; the
  // list rows do not carry it.
  const { data: tripsPage } = useTrips({ limit: 100 }, { enabled: !isEditing });
  const { data: selectedTrip } = useTrip(form.linkedTripId, { enabled: Boolean(form.linkedTripId) && !isEditing });

  const previewItem = useMemo(
    () => (isEditing ? previewFromItinerary(itinerary, form) : previewFromTripDetail(selectedTrip, form)),
    [isEditing, itinerary, selectedTrip, form],
  );

  const { mutate: createItinerary, isPending: creating } = useCreateItinerary();
  const { mutate: updateItinerary, isPending: updating } = useUpdateItinerary();
  const saving = creating || updating;

  const handleSubmit = (e) => {
    e.preventDefault();

    const fields = {
      logoUrl: optionalText(form.logoUrl, { editing: isEditing }),
      arrivalTime: optionalText(form.arrivalTime, { editing: isEditing }),
      flightTime: optionalText(form.flightTime, { editing: isEditing }),
      miles: optionalText(form.miles, { editing: isEditing }),
      departureFbo: optionalText(form.departureFbo, { editing: isEditing }),
      arrivalFbo: optionalText(form.arrivalFbo, { editing: isEditing }),
      operatorItineraryUrl: optionalText(form.operatorItineraryUrl, { editing: isEditing }),
      operatorItineraryText: optionalText(form.operatorItineraryText, { editing: isEditing }),
      exteriorImageUrl: optionalText(form.exteriorImage, { editing: isEditing }),
      interiorImageUrl: optionalText(form.interiorImage, { editing: isEditing }),
      catering: optionalText(form.catering, { editing: isEditing }),
      groundTransport: optionalText(form.groundTransport, { editing: isEditing }),
      notes: optionalText(form.notes, { editing: isEditing }),
    };

    if (isEditing) {
      updateItinerary({ id: itinerary.id, ...fields }, { onSuccess: onDone });
    } else {
      if (!form.linkedTripId) return;
      createItinerary({ tripId: form.linkedTripId, ...fields }, { onSuccess: onDone });
    }
  };

  return (
    <>
      {/* Responsive switcher — only large screens show both panes at once */}
      <div className="lg:hidden border-b border-border px-4 pt-2">
        <DetailTabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: the form */}
        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex-1 min-w-0 overflow-y-auto p-6 flex flex-col gap-5",
            activeTab !== "form" && "hidden lg:flex"
          )}
        >
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
            <div className="flex flex-col gap-1">
              <h2 className="font-montserrat font-bold text-[20px] text-foreground">
                {isEditing ? "Edit Itinerary" : "Build Itinerary"}
              </h2>
              <p className="font-montserrat text-[13px] text-muted-foreground">
                {isEditing ? `For ${itinerary?.tripReference ?? "this trip"}` : "Compose the passenger itinerary from a saved trip"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onDone} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/40 border border-border/50">
              <p className="font-montserrat font-bold text-[13px] text-foreground">{itinerary?.tripReference}</p>
              <p className="font-montserrat text-[12px] text-muted-foreground">
                {itinerary?.client ? displayName(itinerary.client) : "—"} •{" "}
                {itinerary?.originAirport?.icao ?? "—"} → {itinerary?.destinationAirport?.icao ?? "—"}
              </p>
            </div>
          ) : (
            <FieldWrapper label="Choose Saved Trip">
              <CommonSelect
                value={form.linkedTripId}
                onChange={set("linkedTripId")}
                placeholder="Select a trip"
                options={(tripsPage?.data ?? []).map((t) => {
                  const row = toTripRow(t);
                  return { value: t.id, label: `${row.reference} - ${row.client} (${row.route})` };
                })}
                className="h-11 text-[13px]"
              />
              <p className="font-montserrat text-[11px] text-muted-foreground">
                Aircraft, operator, tail, route and the passenger manifest come from the trip and cannot be typed here.
              </p>
            </FieldWrapper>
          )}

          <FieldWrapper label="Optional Logo Upload">
            <FileUpload
              variant="dropzone"
              kind="image"
              visibility="PUBLIC"
              accept={ACCEPT.image}
              heading="Drag & drop a logo"
              description="or click to upload"
              value={form.logoUrl}
              onUploaded={(data) => set("logoUrl")(data.url)}
              onRemove={() => set("logoUrl")("")}
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <TimeField label="Outbound Arrival Time" value={form.arrivalTime} onChange={set("arrivalTime")} />
            <FieldWrapper label="Flight Time">
              <CommonInput placeholder="2h 45m" value={form.flightTime} onChange={(e) => set("flightTime")(e.target.value)} className="h-11 text-[13px] font-montserrat" />
            </FieldWrapper>
            <FieldWrapper label="Miles">
              <CommonInput placeholder="1,096 nm" value={form.miles} onChange={(e) => set("miles")(e.target.value)} className="h-11 text-[13px] font-montserrat" />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Departure FBO (overrides the airport's default)">
              <CommonInput placeholder="Leave blank to use the airport's assigned FBO" value={form.departureFbo} onChange={(e) => set("departureFbo")(e.target.value)} className="h-11 text-[13px] font-montserrat" />
            </FieldWrapper>
            <FieldWrapper label="Arrival FBO (overrides the airport's default)">
              <CommonInput placeholder="Leave blank to use the airport's assigned FBO" value={form.arrivalFbo} onChange={(e) => set("arrivalFbo")(e.target.value)} className="h-11 text-[13px] font-montserrat" />
            </FieldWrapper>
          </div>

          {/* Operator Itinerary Import — the upload is real (the file is
              stored); nothing extracts data from it. No parsing pipeline
              exists anywhere in this system, and inventing one client-side
              would mean guessing at flight data from a PDF. */}
          <FieldWrapper label="Operator Itinerary Import">
            <p className="font-montserrat text-[13px] text-muted-foreground -mt-1">
              Attach the operator&apos;s itinerary (PDF, screenshot/photo, or text file) for reference on this record.
            </p>
            <FileUpload
              variant="dropzone"
              kind="auto"
              visibility="PRIVATE"
              accept={`${ACCEPT.image},${ACCEPT.document}`}
              heading="Drag & drop operator itinerary"
              description="PDF, screenshot/photo, or text file"
              value={form.operatorItineraryUrl}
              onUploaded={(data) => set("operatorItineraryUrl")(data.url)}
              onRemove={() => set("operatorItineraryUrl")("")}
            />
          </FieldWrapper>

          <FieldWrapper label="Operator Itinerary Text">
            <CommonInput
              type="textarea"
              placeholder="Paste operator itinerary text here if the file does not import cleanly..."
              value={form.operatorItineraryText}
              onChange={(e) => set("operatorItineraryText")(e.target.value)}
              rows={3}
              className="text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Aircraft Exterior Photo (overrides the fleet photo)">
              <FileUpload
                variant="dropzone"
                kind="image"
                visibility="PUBLIC"
                accept={ACCEPT.image}
                heading="Drag & drop exterior photo"
                description="or click to upload"
                value={form.exteriorImage}
                library
                onUploaded={(data) => set("exteriorImage")(data.url)}
                onRemove={() => set("exteriorImage")("")}
              />
            </FieldWrapper>
            <FieldWrapper label="Cabin / Interior Photo (overrides the fleet photo)">
              <FileUpload
                variant="dropzone"
                kind="image"
                visibility="PUBLIC"
                accept={ACCEPT.image}
                heading="Drag & drop cabin/interior photo"
                description="or click to upload"
                value={form.interiorImage}
                library
                onUploaded={(data) => set("interiorImage")(data.url)}
                onRemove={() => set("interiorImage")("")}
              />
            </FieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Catering">
              <CommonInput value={form.catering} onChange={(e) => set("catering")(e.target.value)} className="h-11 text-[13px] font-montserrat" />
            </FieldWrapper>
            <FieldWrapper label="Ground transport">
              <CommonInput value={form.groundTransport} onChange={(e) => set("groundTransport")(e.target.value)} className="h-11 text-[13px] font-montserrat" />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Notes">
            <CommonInput
              type="textarea"
              placeholder="Internal notes visible to brokers only..."
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={3}
              className="text-[13px] font-montserrat"
            />
          </FieldWrapper>

          <div className="flex items-center gap-3 pt-4 border-t border-border w-full mt-auto">
            <Button type="button" variant="outline" className="h-10 px-5 gap-2" onClick={onDone}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-5 gap-2" disabled={saving || (!isEditing && !form.linkedTripId)}>
              <FileText className="size-4" />
              {isEditing ? "Save Changes" : "Build Itinerary"}
            </Button>
          </div>
        </form>

        {/* Right: the live preview — same component the saved-record sheet
            renders, so what a broker composes here is exactly what gets saved. */}
        <div
          className={cn(
            "flex-1 min-w-0 overflow-y-auto p-6 border-t lg:border-t-0 lg:border-l border-border bg-secondary/20 flex flex-col gap-6",
            activeTab !== "preview" && "hidden lg:flex"
          )}
        >
          <TribecaLetterhead />
          <ItineraryPreview item={previewItem} />
        </div>
      </div>
    </>
  );
}
