"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, FileText, X, Clock } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { trips } from "@/dummyData/trips";
import { FBO_OPTIONS, ITINERARY_AIRCRAFT_OPTIONS } from "@/dummyData/itineraries";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import { CommonDatePicker } from "@/components/common/DatePicker";
import DetailTabNav from "@/components/common/DetailTabNav";
import TribecaLetterhead from "@/components/common/TribecaLetterhead";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import ItineraryPreview from "@/components/itineraries/ItineraryPreview";
import { formatShortDay, formatTime12, parseLocalDate } from "@/lib/date";
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

export default function BuildItineraryDialog() {
  const open = useItinerariesStore((s) => s.buildModalOpen);
  const closeModal = useItinerariesStore((s) => s.closeBuildModal);
  const addItinerary = useItinerariesStore((s) => s.addItinerary);

  const [activeTab, setActiveTab] = useState("form");

  const [linkedTrip, setLinkedTrip] = useState("");
  const [client, setClient] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  // Every field opens blank. The form used to open on a route (to "KTTB",
  // which is not an airport), a caterer, a car and an FBO, so a hurried save
  // put a Mercedes and seafood on an itinerary nobody had ordered them for.
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [operator, setOperator] = useState("");
  const [tailNumber, setTailNumber] = useState("");
  const [flightTime, setFlightTime] = useState("");
  const [miles, setMiles] = useState("");
  const [departureFboName, setDepartureFboName] = useState("");
  const [arrivalFboName, setArrivalFboName] = useState("");
  const [operatorItineraryUrl, setOperatorItineraryUrl] = useState("");
  const [operatorItineraryText, setOperatorItineraryText] = useState("");
  const [exteriorImage, setExteriorImage] = useState("");
  const [interiorImage, setInteriorImage] = useState("");
  const [catering, setCatering] = useState("");
  const [groundTransport, setGroundTransport] = useState("");
  const [fbo, setFbo] = useState("");
  const [notes, setNotes] = useState("");

  const [passengers, setPassengers] = useState([{ name: "", passport: "" }]);

  const resetForm = () => {
    setLinkedTrip("");
    setClient("");
    setLogoUrl("");
    setRouteFrom("");
    setRouteTo("");
    setDepartureDate("");
    setDepartureTime("");
    setArrivalTime("");
    setAircraft("");
    setOperator("");
    setTailNumber("");
    setFlightTime("");
    setMiles("");
    setDepartureFboName("");
    setArrivalFboName("");
    setOperatorItineraryUrl("");
    setOperatorItineraryText("");
    setExteriorImage("");
    setInteriorImage("");
    setCatering("");
    setGroundTransport("");
    setFbo("");
    setNotes("");
    setPassengers([{ name: "", passport: "" }]);
    setActiveTab("form");
  };

  const handleTripSelect = (value) => {
    setLinkedTrip(value);
    const found = trips.find((t) => t.id === value);
    if (found) {
      setClient(found.client);
      setRouteFrom(found.from);
      setRouteTo(found.to);
      if (found.aircraft) setAircraft(found.aircraft);
      if (found.operator) setOperator(found.operator);
    }
  };

  const addPassengerRow = () => setPassengers((prev) => [...prev, { name: "", passport: "" }]);
  const removePassengerRow = (index) => setPassengers((prev) => prev.filter((_, i) => i !== index));
  const updatePassenger = (index, field, value) =>
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const fboByName = (name) => {
    if (!name) return null;
    const match = FBO_OPTIONS.find((f) => f.name === name);
    // Phone and email stay empty until the FBO directory has them — "Contact
    // FBO" in a phone field reads like a number somebody looked up.
    return { name, address: match?.address || "", phone: "", email: "" };
  };

  // The same object shape ItineraryPreview already renders for a saved
  // record — the live preview and the eventual detail sheet are the same
  // component reading the same fields, so nothing can drift between "what
  // the broker saw while building it" and "what got saved."
  const previewItem = useMemo(
    () => ({
      client,
      from: routeFrom,
      to: routeTo,
      departureDate: departureDate ? formatShortDay(parseLocalDate(departureDate)) : "",
      departureTime: departureTime ? formatTime12(departureTime) : "",
      arrivalTime: arrivalTime ? formatTime12(arrivalTime) : "",
      aircraft,
      operator,
      tailNumber,
      flightTime,
      miles,
      passengers,
      catering,
      groundTransport,
      fbo,
      departureFbo: fboByName(departureFboName),
      arrivalFbo: fboByName(arrivalFboName),
      exteriorImageUrl: exteriorImage,
      interiorImageUrl: interiorImage,
      tripStatus: "Booked",
    }),
    [
      client, routeFrom, routeTo, departureDate, departureTime, arrivalTime,
      aircraft, operator, tailNumber, flightTime, miles, passengers,
      catering, groundTransport, fbo, departureFboName, arrivalFboName,
      exteriorImage, interiorImage,
    ],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const listedPassengers = passengers
      .filter((p) => p.name.trim() || p.passport.trim())
      .map((p) => ({ name: p.name.trim(), passport: p.passport.trim() }));

    // What was typed, and nothing else. Blanks stay blank and the document
    // renders them as em dashes — this used to save "Passenger Client", a
    // KTEB → KPBI route, a 22:00 departure, "Passenger 1" and a random
    // passport number for anything left empty.
    addItinerary({
      client: client || undefined,
      from: routeFrom || undefined,
      to: routeTo || undefined,
      departure: departureDate
        ? [departureDate, departureTime].filter(Boolean).join(" • ")
        : undefined,
      departureDate: previewItem.departureDate || undefined,
      departureTime: previewItem.departureTime || undefined,
      arrivalTime: previewItem.arrivalTime || undefined,
      aircraft: aircraft || undefined,
      operator: operator || undefined,
      tailNumber: tailNumber || undefined,
      flightTime: flightTime || undefined,
      miles: miles || undefined,
      passengersCount: listedPassengers.length ? `${listedPassengers.length} pax` : undefined,
      passengers: listedPassengers,
      catering,
      groundTransport,
      fbo,
      departureFbo: previewItem.departureFbo || undefined,
      arrivalFbo: previewItem.arrivalFbo || undefined,
      exteriorImageUrl: exteriorImage || undefined,
      interiorImageUrl: interiorImage || undefined,
      logoUrl: logoUrl || undefined,
      notes,
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { closeModal(); resetForm(); } }}>
      <DialogContent
        showCloseButton={false}
        className="w-[97vw] h-[94vh] max-w-none sm:max-w-none p-0 gap-0 flex flex-col overflow-hidden rounded-xl"
      >
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
                <h2 className="font-montserrat font-bold text-[20px] text-foreground">Build Itinerary</h2>
                <p className="font-montserrat text-[13px] text-muted-foreground">
                  Compose the passenger itinerary from a trip
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => { closeModal(); resetForm(); }}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="Choose Saved Trip">
                <CommonSelect
                  value={linkedTrip}
                  onChange={handleTripSelect}
                  placeholder="Select a trip"
                  options={trips.map((t) => ({ value: t.id, label: `${t.id} - ${t.client} (${t.from} → ${t.to})` }))}
                  className="h-11 text-[13px]"
                />
              </FieldWrapper>
              <FieldWrapper label="Client">
                <CommonInput
                  placeholder="Select client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
            </div>

            <FieldWrapper label="Optional Logo Upload">
              <FileUpload
                variant="dropzone"
                kind="image"
                visibility="PUBLIC"
                accept={ACCEPT.image}
                heading="Drag & drop a logo"
                description="or click to upload"
                value={logoUrl}
                onUploaded={(data) => setLogoUrl(data.url)}
                onRemove={() => setLogoUrl("")}
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <FieldWrapper label="Route from">
                <CommonInput
                  value={routeFrom}
                  onChange={(e) => setRouteFrom(e.target.value.toUpperCase())}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
              <FieldWrapper label="Route to">
                <CommonInput
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value.toUpperCase())}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
              <FieldWrapper label="Departure date">
                <CommonDatePicker value={departureDate} onChange={setDepartureDate} placeholder="Choose Date" />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <TimeField label="Outbound Departure Time" value={departureTime} onChange={setDepartureTime} />
              <TimeField label="Outbound Arrival Time" value={arrivalTime} onChange={setArrivalTime} />
            </div>

            <div className="flex flex-col gap-2.5 w-full pt-1">
              <div className="flex items-center justify-between">
                <span className="font-montserrat font-bold text-[14px] text-foreground">
                  Passengers ({passengers.length})
                </span>
                <button
                  type="button"
                  onClick={addPassengerRow}
                  className="flex items-center gap-1 font-montserrat font-bold text-[12px] text-purple hover:opacity-80 cursor-pointer"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                {passengers.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 w-full">
                    <div className="flex-1 min-w-0">
                      <CommonInput
                        placeholder="Passengers name"
                        value={p.name}
                        onChange={(e) => updatePassenger(idx, "name", e.target.value)}
                        className="h-11 text-[13px] font-montserrat"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CommonInput
                        placeholder="Passport"
                        value={p.passport}
                        onChange={(e) => updatePassenger(idx, "passport", e.target.value)}
                        className="h-11 text-[13px] font-montserrat"
                      />
                    </div>
                    {passengers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePassengerRow(idx)}
                        className="p-2.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0 cursor-pointer"
                        aria-label="Remove passenger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : (
                      <div className="w-9 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="Aircraft">
                <CommonSelect
                  value={aircraft}
                  onChange={setAircraft}
                  placeholder="Select aircraft"
                  options={ITINERARY_AIRCRAFT_OPTIONS}
                  className="h-11 text-[13px]"
                />
              </FieldWrapper>
              <FieldWrapper label="Tail Number">
                <CommonInput
                  placeholder="e.g. N1048TJ"
                  value={tailNumber}
                  onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="Flight Time">
                <CommonInput
                  placeholder="2h 45m"
                  value={flightTime}
                  onChange={(e) => setFlightTime(e.target.value)}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
              <FieldWrapper label="Miles">
                <CommonInput
                  placeholder="1,096 nm"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="FBO Departure">
                <CommonSelect
                  value={departureFboName}
                  onChange={setDepartureFboName}
                  placeholder="Select FBO"
                  options={FBO_OPTIONS.map((f) => f.name)}
                  className="h-11 text-[13px]"
                />
              </FieldWrapper>
              <FieldWrapper label="FBO Arrival">
                <CommonSelect
                  value={arrivalFboName}
                  onChange={setArrivalFboName}
                  placeholder="Select FBO"
                  options={FBO_OPTIONS.map((f) => f.name)}
                  className="h-11 text-[13px]"
                />
              </FieldWrapper>
            </div>

            {/* Operator Itinerary Import — the upload is real (the file is
                stored); the auto-fill this section's Figma copy describes is
                not. No parsing/extraction endpoint exists anywhere in this
                system yet, and inventing one client-side would mean guessing
                at flight data from a PDF, which is exactly the kind of
                confident-wrong-number this project's rules exist to prevent.
                The file still attaches to the record for reference. */}
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
                value={operatorItineraryUrl}
                onUploaded={(data) => setOperatorItineraryUrl(data.url)}
                onRemove={() => setOperatorItineraryUrl("")}
              />
            </FieldWrapper>

            <FieldWrapper label="Operator Itinerary Text">
              <CommonInput
                type="textarea"
                placeholder="Paste operator itinerary text here if the file does not import cleanly..."
                value={operatorItineraryText}
                onChange={(e) => setOperatorItineraryText(e.target.value)}
                rows={3}
                className="text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <FieldWrapper label="Aircraft Exterior Photo">
                <FileUpload
                  variant="dropzone"
                  kind="image"
                  visibility="PUBLIC"
                  accept={ACCEPT.image}
                  heading="Drag & drop exterior photo"
                  description="or click to upload"
                  value={exteriorImage}
                  onUploaded={(data) => setExteriorImage(data.url)}
                  onRemove={() => setExteriorImage("")}
                />
              </FieldWrapper>
              <FieldWrapper label="Cabin / Interior Photo">
                <FileUpload
                  variant="dropzone"
                  kind="image"
                  visibility="PUBLIC"
                  accept={ACCEPT.image}
                  heading="Drag & drop cabin/interior photo"
                  description="or click to upload"
                  value={interiorImage}
                  onUploaded={(data) => setInteriorImage(data.url)}
                  onRemove={() => setInteriorImage("")}
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <FieldWrapper label="Catering">
                <CommonInput
                  value={catering}
                  onChange={(e) => setCatering(e.target.value)}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
              <FieldWrapper label="Ground transport">
                <CommonInput
                  value={groundTransport}
                  onChange={(e) => setGroundTransport(e.target.value)}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
              <FieldWrapper label="FBO">
                <CommonInput
                  value={fbo}
                  onChange={(e) => setFbo(e.target.value)}
                  className="h-11 text-[13px] font-montserrat"
                />
              </FieldWrapper>
            </div>

            <FieldWrapper label="Notes">
              <CommonInput
                type="textarea"
                placeholder="Internal notes visible to brokers only..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <div className="flex items-center gap-3 pt-4 border-t border-border w-full mt-auto">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-5 gap-2"
                onClick={() => { closeModal(); resetForm(); }}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button type="submit" className="h-10 px-5 gap-2">
                <FileText className="size-4" />
                Build Itinerary
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
      </DialogContent>
    </Dialog>
  );
}
