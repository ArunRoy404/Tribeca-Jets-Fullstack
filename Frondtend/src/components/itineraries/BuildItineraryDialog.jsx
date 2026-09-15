"use client";

import { useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { trips } from "@/dummyData/trips";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/common/DatePicker";

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

export default function BuildItineraryDialog() {
  const open = useItinerariesStore((s) => s.buildModalOpen);
  const closeModal = useItinerariesStore((s) => s.closeBuildModal);
  const addItinerary = useItinerariesStore((s) => s.addItinerary);

  const [linkedTrip, setLinkedTrip] = useState("");
  const [client, setClient] = useState("");
  const [routeFrom, setRouteFrom] = useState("KTEB");
  const [routeTo, setRouteTo] = useState("KTTB");
  const [departureDate, setDepartureDate] = useState("2026-08-24");
  const [catering, setCatering] = useState("Sea food Premium");
  const [groundTransport, setGroundTransport] = useState("Mercedes S class");
  const [fbo, setFbo] = useState("Signature Flight Support");
  const [notes, setNotes] = useState("");

  const [passengers, setPassengers] = useState([
    { name: "", passport: "" },
    { name: "", passport: "" },
  ]);

  const handleTripSelect = (e) => {
    const selectedId = e.target.value;
    setLinkedTrip(selectedId);
    const found = trips.find((t) => t.id === selectedId);
    if (found) {
      setClient(found.client);
      setRouteFrom(found.from);
      setRouteTo(found.to);
    }
  };

  const addPassengerRow = () => {
    setPassengers((prev) => [...prev, { name: "", passport: "" }]);
  };

  const removePassengerRow = (index) => {
    setPassengers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePassenger = (index, field, value) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addItinerary({
      client: client || "Passenger Client",
      from: routeFrom || "KTEB",
      to: routeTo || "KPBI",
      departure: `${departureDate} • 22:00`,
      passengersCount: `${passengers.length} pax`,
      passengers: passengers.map((p, i) => ({
        name: p.name || `Passenger ${i + 1}`,
        passport: p.passport || `P-${Math.floor(1000000 + Math.random() * 9000000)}`,
      })),
      catering,
      groundTransport,
      fbo,
      notes,
    });
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-180 max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="flex flex-col items-start gap-1 pb-3 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Build Itinerary
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            Compose the passenger itinerary from a trip
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-3 w-full">
          {/* Row 1: Linked trip & Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Linked trip">
              <select
                value={linkedTrip}
                onChange={handleTripSelect}
                className="h-11 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full"
              >
                <option value="">Select a trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} - {t.client} ({t.from} → {t.to})
                  </option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper label="Client">
              <Input
                placeholder="Select client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          {/* Row 2: Route & Departure Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <FieldWrapper label="Route from">
              <Input
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Route to">
              <Input
                value={routeTo}
                onChange={(e) => setRouteTo(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Departure date">
              <DatePicker
                value={departureDate}
                onChange={setDepartureDate}
                placeholder="Choose Date"
              />
            </FieldWrapper>
          </div>

          {/* Row 3: Passengers Roster Section */}
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
                    <Input
                      placeholder="Passengers name"
                      value={p.name}
                      onChange={(e) => updatePassenger(idx, "name", e.target.value)}
                      className="h-11 text-[13px] font-montserrat"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
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
                      className="p-2.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
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

          {/* Row 4: Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-1">
            <FieldWrapper label="Catering">
              <Input
                value={catering}
                onChange={(e) => setCatering(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Ground transport">
              <Input
                value={groundTransport}
                onChange={(e) => setGroundTransport(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="FBO">
              <Input
                value={fbo}
                onChange={(e) => setFbo(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          {/* Row 5: Notes */}
          <FieldWrapper label="Notes">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes visible to brokers only..."
              className="w-full p-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </FieldWrapper>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border w-full">
            <Button type="button" variant="outline" className="h-10 px-5" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-5 gap-2">
              <FileText className="size-4" />
              Build Itinerary
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
