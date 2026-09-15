"use client";

import { useState, useEffect } from "react";
import { Edit, X } from "lucide-react";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";

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

export default function AddEmptyLegDialog() {
  const open = useEmptyLegsStore((s) => s.addModalOpen);
  const editingLeg = useEmptyLegsStore((s) => s.editingLeg);
  const closeModal = useEmptyLegsStore((s) => s.closeAddModal);
  const addEmptyLeg = useEmptyLegsStore((s) => s.addEmptyLeg);
  const updateEmptyLeg = useEmptyLegsStore((s) => s.updateEmptyLeg);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [operator, setOperator] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [status, setStatus] = useState("Available");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingLeg) {
      setOrigin(editingLeg.origin || "");
      setDestination(editingLeg.destination || "");
      setFlightDate(editingLeg.date || "");
      setExpiryDate(editingLeg.expiry || "");
      setAircraft(editingLeg.aircraft || "");
      setOperator(editingLeg.operator || "");
      setPriceRaw(editingLeg.priceRaw || 12500);
      setStatus(editingLeg.status || "Available");
      setNotes(editingLeg.notes || "");
    } else {
      setOrigin("Miami");
      setDestination("Teterboro");
      setFlightDate("");
      setExpiryDate("");
      setAircraft("Challenger 605");
      setOperator("VistaJet");
      setPriceRaw("12500");
      setStatus("Available");
      setNotes("");
    }
  }, [editingLeg, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      origin,
      destination,
      date: flightDate || "Aug 12, 2026",
      expiry: expiryDate || "Aug 12",
      aircraft: aircraft || "Challenger 605",
      operator: operator || "VistaJet",
      priceRaw: Number(priceRaw || 12500),
      status,
      notes,
    };

    if (editingLeg) {
      updateEmptyLeg(editingLeg.id, data);
    } else {
      addEmptyLeg(data);
    }
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-175 max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="flex flex-col items-start gap-1 pb-3 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            {editingLeg ? "Edit Empty Leg" : "Add Empty Leg"}
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {editingLeg ? "Update the empty leg opportunity details" : "Create a new empty leg opportunity"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-3 w-full">
          {/* Row 1: Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Origin">
              <Input
                placeholder="Miami"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Destination">
              <Input
                placeholder="Teterboro"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
                required
              />
            </FieldWrapper>
          </div>

          {/* Row 2: Flight date & Expiry date with interactive DatePicker and TimePicker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Flight date">
              <DatePicker
                value={flightDate}
                onChange={setFlightDate}
                placeholder="Choose Date"
              />
            </FieldWrapper>

            <FieldWrapper label="Expiry date">
              <TimePicker
                value={expiryDate}
                onChange={setExpiryDate}
                placeholder="Choose Time"
              />
            </FieldWrapper>
          </div>

          {/* Row 3: Aircraft & Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Aircraft">
              <Input
                placeholder="Challenger 605"
                value={aircraft}
                onChange={(e) => setAircraft(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Operator">
              <Input
                placeholder="VistaJet"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>
          </div>

          {/* Row 4: Price & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Price ($)">
              <Input
                type="number"
                placeholder="12500"
                value={priceRaw}
                onChange={(e) => setPriceRaw(e.target.value)}
                className="h-11 text-[13px] font-montserrat"
              />
            </FieldWrapper>

            <FieldWrapper label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="Available">Available</option>
                <option value="Matched">Matched</option>
                <option value="Booked">Booked</option>
                <option value="Expired">Expired</option>
              </select>
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

          {/* Footer Buttons - Left-aligned matching screenshot */}
          <div className="flex items-center justify-start gap-3 pt-4 border-t border-border/40 w-full">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 font-medium text-[13px] gap-1.5"
              onClick={closeModal}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-2"
            >
              <Edit className="size-4" />
              {editingLeg ? "Save Changes" : "Add Empty Leg"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
