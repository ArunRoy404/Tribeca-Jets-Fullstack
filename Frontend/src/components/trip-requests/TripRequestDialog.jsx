"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useTripRequestsStore } from "@/store/useTripRequestsStore";
import { useCreateTripRequest, useUpdateTripRequest } from "@/hooks/trip-requests";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TripRequestForm, {
  EMPTY_TRIP_REQUEST_FORM,
  toTripRequestPayload,
} from "./TripRequestForm";

/** A stored ISO timestamp back into the `YYYY-MM-DD` the date picker speaks. */
const dateValue = (value) => (value ? String(value).slice(0, 10) : "");

/** A stored number back into a text box, without turning null into "0". */
const numberValue = (value) =>
  value === null || value === undefined ? "" : String(value);

/**
 * Files a new enquiry, or edits one.
 *
 * One dialog for both verbs, as every other module does: the fields are
 * identical and the only differences are the title, the mutation and whether a
 * cleared field means "leave it out" or "null it".
 */
export default function TripRequestDialog() {
  const open = useTripRequestsStore((s) => s.addModalOpen);
  const editing = useTripRequestsStore((s) => s.editingRequest);
  const close = useTripRequestsStore((s) => s.closeAddModal);

  const { mutate: createRequest, isPending: isCreating } = useCreateTripRequest();
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateTripRequest();

  const [form, setForm] = useState(EMPTY_TRIP_REQUEST_FORM);
  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /**
   * Prefills from the row the table already has.
   *
   * Every `raw*` field, never the formatted one — the row carries "14 Nov
   * 2026" and "$28,000" for display, and posting either back would be a 400.
   */
  useEffect(() => {
    if (!open) return;
    if (!editing) {
      setForm(EMPTY_TRIP_REQUEST_FORM);
      return;
    }
    setForm({
      clientId: editing.clientId ?? "",
      status: editing.rawStatus ?? "OPEN",
      source: editing.rawSource ?? "",
      aircraftPreference: editing.rawAircraftPreference ?? "",
      originAirportId: editing.originAirportId ?? "",
      destinationAirportId: editing.destinationAirportId ?? "",
      departureDate: dateValue(editing.rawDepartureDate),
      returnDate: dateValue(editing.rawReturnDate),
      quoteDeadline: dateValue(editing.rawQuoteDeadline),
      passengers: numberValue(editing.rawPassengers),
      estimatedValue: numberValue(editing.rawEstimatedValue),
      summary: editing.summary ?? "",
      requirements: editing.requirements ?? "",
      internalNotes: editing.internalNotes ?? "",
    });
  }, [open, editing]);

  const handleClose = () => {
    setForm(EMPTY_TRIP_REQUEST_FORM);
    close();
  };

  const handleSubmit = () => {
    if (!form.clientId) return;

    if (editing?.id) {
      // `forUpdate` sends a cleared field as null rather than omitting it —
      // an omitted field means "leave it alone", which is not what emptying
      // a box means.
      updateRequest(
        { id: editing.id, ...toTripRequestPayload(form, { forUpdate: true }) },
        { onSuccess: handleClose },
      );
      return;
    }

    createRequest(toTripRequestPayload(form), { onSuccess: handleClose });
  };

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              {editing ? `Edit ${editing.reference ?? "Request"}` : "New Trip Request"}
            </DialogTitle>
            <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
              {editing
                ? "Update what the client asked for"
                : "Mark down what a client has asked for, before it becomes a quote"}
            </p>
          </div>
        </div>

        <TripRequestForm form={form} setField={setField} enabled={open} />

        <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
          <Button variant="outline" className="gap-2 px-4 cursor-pointer" onClick={handleClose}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            className="gap-2 px-4 cursor-pointer"
            disabled={isPending || !form.clientId}
            onClick={handleSubmit}
          >
            <Pencil className="size-4" />
            {editing ? "Save Changes" : "File Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
