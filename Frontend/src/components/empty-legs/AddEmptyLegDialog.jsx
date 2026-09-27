"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";
import FormField from "@/components/trips/FormField";
import { useAirports } from "@/hooks/airports";
import { useOperators } from "@/hooks/operators";
import { useAircraftList } from "@/hooks/aircraft";
import { useCreateEmptyLeg, useUpdateEmptyLeg } from "@/hooks/empty-legs";
import { EMPTY_LEG_STATUSES, formatEmptyLegStatus } from "@/lib/emptyLeg";
import { optionalNumber, optionalText } from "@/lib/form";
import { toDateInput } from "@/lib/date";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";

const NONE = "__none__";
const STATUS_OPTIONS = EMPTY_LEG_STATUSES.map((value) => ({ value, label: formatEmptyLegStatus(value) }));

/** "YYYY-MM-DD" + "HH:MM" in the browser's zone, back out of a stored moment. */
function splitMoment(value) {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function initialForm(leg) {
  const expiry = splitMoment(leg?.expiresAt);
  return {
    originAirportId: leg?.originAirportId ?? "",
    destinationAirportId: leg?.destinationAirportId ?? "",
    departureDate: toDateInput(leg?.departureDate),
    departureTime: leg?.departureTime ?? "",
    expiryDate: expiry.date,
    expiryTime: expiry.time,
    operatorId: leg?.operatorId ?? "",
    aircraftId: leg?.aircraftId ?? "",
    aircraftDescription: leg?.aircraftDescription ?? "",
    seats: leg?.seats ?? "",
    price: leg?.price ?? "",
    // The stored status, not the read one: editing a lapsed leg must not
    // quietly save it as EXPIRED because that is how it currently reads.
    status: leg?.storedStatus ?? leg?.status ?? "AVAILABLE",
    notes: leg?.notes ?? "",
  };
}

/** Add or edit an operator's empty leg. */
export default function AddEmptyLegDialog() {
  const open = useEmptyLegsStore((s) => s.addModalOpen);
  const editingLeg = useEmptyLegsStore((s) => s.editingLeg);
  const close = useEmptyLegsStore((s) => s.closeAddModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-175 max-h-[90vh] overflow-y-auto p-6">
        {open && <EmptyLegForm key={editingLeg?.id ?? "new"} leg={editingLeg} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function EmptyLegForm({ leg, onDone }) {
  const editing = Boolean(leg);
  const [form, setForm] = useState(() => initialForm(leg));
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const { data: airports } = useAirports({ limit: 100, sortBy: "icao", sortOrder: "asc" });
  const { data: operators } = useOperators({ limit: 100 });
  const { data: aircraft } = useAircraftList({ limit: 100 });

  const airportOptions = useMemo(
    () => (airports?.data ?? []).map((a) => ({ value: a.id, label: `${a.icao} · ${a.city ?? a.name}` })),
    [airports?.data],
  );
  const operatorOptions = useMemo(
    () => [{ value: NONE, label: "Not recorded" }, ...(operators?.data ?? []).map((o) => ({ value: o.id, label: o.name }))],
    [operators?.data],
  );
  // The operator's own tails first when one is chosen — the airframe on an
  // empty leg is almost always theirs.
  const aircraftOptions = useMemo(() => {
    const all = aircraft?.data ?? [];
    const mine = form.operatorId ? all.filter((a) => a.operatorId === form.operatorId) : all;
    const list = mine.length ? mine : all;
    return [
      { value: NONE, label: "Not in the fleet list" },
      ...list.map((a) => ({ value: a.id, label: [a.tailNumber, a.model].filter(Boolean).join(" · ") })),
    ];
  }, [aircraft?.data, form.operatorId]);

  const { mutate: createLeg, isPending: creating } = useCreateEmptyLeg();
  const { mutate: updateLeg, isPending: updating } = useUpdateEmptyLeg();
  const isPending = creating || updating;

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.originAirportId) next.originAirportId = "Choose where it departs";
    if (!form.destinationAirportId) next.destinationAirportId = "Choose where it arrives";
    if (form.originAirportId && form.originAirportId === form.destinationAirportId) {
      next.destinationAirportId = "Departure and arrival cannot be the same airport";
    }
    if (!form.departureDate) next.departureDate = "Choose the day it flies";
    if (form.expiryTime && !form.expiryDate) next.expiryDate = "Choose the day the offer ends";
    setErrors(next);
    if (Object.keys(next).length) return;

    const clear = { editing };
    // The offer ends at the time given, in the desk's own zone, or at the end
    // of that day when no time is given.
    const expiresAt = form.expiryDate
      ? new Date(`${form.expiryDate}T${form.expiryTime || "23:59"}`).toISOString()
      : editing
        ? null
        : undefined;

    const payload = {
      originAirportId: form.originAirportId,
      destinationAirportId: form.destinationAirportId,
      departureDate: form.departureDate,
      departureTime: optionalText(form.departureTime, clear),
      expiresAt,
      operatorId: form.operatorId && form.operatorId !== NONE ? form.operatorId : editing ? null : undefined,
      aircraftId: form.aircraftId && form.aircraftId !== NONE ? form.aircraftId : editing ? null : undefined,
      aircraftDescription: optionalText(form.aircraftDescription, clear),
      seats: optionalNumber(form.seats, clear),
      price: optionalNumber(form.price, clear),
      status: form.status,
      notes: optionalText(form.notes, clear),
    };

    const onError = (error) => setErrors(error?.fieldErrors ?? {});
    if (editing) updateLeg({ id: leg.id, ...payload }, { onSuccess: onDone, onError });
    else createLeg(payload, { onSuccess: onDone, onError });
  };

  return (
    <>
      <DialogHeader className="flex flex-col items-start gap-1 pb-3 border-b border-border">
        <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
          {editing ? "Edit Empty Leg" : "Add Empty Leg"}
        </DialogTitle>
        <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
          Trip requests on the same route appear as matches once it is saved.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-3 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Departs from" error={errors.originAirportId}>
            <CommonSelect value={form.originAirportId} onChange={set("originAirportId")} options={airportOptions} placeholder="Choose airport" />
          </FormField>
          <FormField label="Arrives at" error={errors.destinationAirportId}>
            <CommonSelect value={form.destinationAirportId} onChange={set("destinationAirportId")} options={airportOptions} placeholder="Choose airport" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Departure date" error={errors.departureDate}>
            <DatePicker value={form.departureDate} onChange={set("departureDate")} placeholder="Choose Date" />
          </FormField>
          <FormField label="Departure time (Optional)" error={errors.departureTime}>
            <TimePicker value={form.departureTime} onChange={set("departureTime")} placeholder="Choose Time" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Offer ends on (Optional)" error={errors.expiryDate ?? errors.expiresAt}>
            <DatePicker value={form.expiryDate} onChange={set("expiryDate")} placeholder="No expiry" />
          </FormField>
          <FormField label="Offer ends at (Optional)">
            <TimePicker value={form.expiryTime} onChange={set("expiryTime")} placeholder="End of day" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Operator (Optional)" error={errors.operatorId}>
            <CommonSelect value={form.operatorId || NONE} onChange={set("operatorId")} options={operatorOptions} placeholder="Choose operator" />
          </FormField>
          <FormField label="Aircraft (Optional)" error={errors.aircraftId}>
            <CommonSelect value={form.aircraftId || NONE} onChange={set("aircraftId")} options={aircraftOptions} placeholder="Choose aircraft" />
          </FormField>
        </div>

        {(!form.aircraftId || form.aircraftId === NONE) && (
          <FormField label="Aircraft description (Optional)" error={errors.aircraftDescription}>
            <CommonInput
              value={form.aircraftDescription}
              onChange={(e) => set("aircraftDescription")(e.target.value)}
              placeholder="e.g. Challenger 605"
            />
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <FormField label="Price, USD (Optional)" error={errors.price}>
            <CommonInput type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price")(e.target.value)} placeholder="e.g. 12500" />
          </FormField>
          <FormField label="Seats (Optional)" error={errors.seats}>
            <CommonInput type="number" min="1" step="1" value={form.seats} onChange={(e) => set("seats")(e.target.value)} placeholder="e.g. 8" />
          </FormField>
          <FormField label="Status" error={errors.status}>
            <CommonSelect value={form.status} onChange={set("status")} options={STATUS_OPTIONS} />
          </FormField>
        </div>

        <FormField label="Notes (Optional)" error={errors.notes}>
          <CommonInput
            type="textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Desk notes. Never shown to a client."
          />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40 w-full">
          <Button type="button" variant="outline" className="h-10 px-4 gap-1.5" onClick={onDone}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="h-10 px-5 gap-2">
            {editing ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {editing ? "Save Changes" : "Add Empty Leg"}
          </Button>
        </div>
      </form>
    </>
  );
}
