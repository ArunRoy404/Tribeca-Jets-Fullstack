"use client";

import { useState } from "react";
import { Calendar, Pencil, X } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { sourcingAircraftCategoryOptions } from "@/dummyData/operatorSourcing";
import { clientOptions } from "@/dummyData/createTripOptions";
import { trips } from "@/dummyData/trips";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import IconInput from "@/components/common/IconInput";
import DatePicker from "@/components/common/DatePicker";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const tripOptions = trips.map((t) => `${t.id.replace("#", "")} · ${t.client}`);

const EMPTY_FORM = {
  linkedTrip: "",
  client: "",
  aircraftNeeded: "",
  routeFrom: "",
  routeTo: "",
  departure: "",
  budget: "",
  deadline: "",
  notes: "",
};

export default function NewSourcingRequestDialog() {
  const open = useOperatorSourcingStore((s) => s.newRequestOpen);
  const closeNewRequest = useOperatorSourcingStore((s) => s.closeNewRequest);
  const addRequest = useOperatorSourcingStore((s) => s.addRequest);
  const [form, setForm] = useState(EMPTY_FORM);

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setForm(EMPTY_FORM);
    closeNewRequest();
  };

  const handleCreate = () => {
    const linkedId = form.linkedTrip.split(" · ")[0];
    addRequest({
      ...(linkedId && { id: linkedId }),
      client: form.client || "Unassigned",
      broker: "Ari",
      from: (form.routeFrom || "TBD").toUpperCase(),
      to: (form.routeTo || "TBD").toUpperCase(),
      departure: form.departure || "TBD",
      aircraftNeeded: form.aircraftNeeded || "TBD",
      budget: form.budget ? `$${Number(form.budget).toLocaleString()}` : "$0",
      deadline: form.deadline || "TBD",
      notes: form.notes,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              New Sourcing Request
            </DialogTitle>
            <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
              Send a request to operators for trip quote
            </p>
          </div>
        </div>

        <FormField label="Linked trip" labelClassName={LABEL_CLASS}>
          <PickerSelect
            value={form.linkedTrip}
            onChange={setField("linkedTrip")}
            options={tripOptions}
            placeholder="Select a trip"
            className={FIELD_CLASS}
          />
        </FormField>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Client" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.client}
              onChange={setField("client")}
              options={clientOptions}
              placeholder="Select client"
              className={FIELD_CLASS}
            />
          </FormField>
          <FormField label="Aircraft needed" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.aircraftNeeded}
              onChange={setField("aircraftNeeded")}
              options={sourcingAircraftCategoryOptions}
              placeholder="Select Aircraft"
              className={FIELD_CLASS}
            />
          </FormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Route from" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <Input
              className={FIELD_CLASS}
              placeholder="e.g. KTEB"
              value={form.routeFrom}
              onChange={(e) => setField("routeFrom")(e.target.value)}
            />
          </FormField>
          <FormField label="Route to" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <Input
              className={FIELD_CLASS}
              placeholder="e.g. KPBI"
              value={form.routeTo}
              onChange={(e) => setField("routeTo")(e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Departure" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              className={FIELD_CLASS}
              value={form.departure}
              onChange={setField("departure")}
              placeholder="Choose Date"
            />
          </FormField>
          <FormField label="Budget" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <Input
              className={FIELD_CLASS}
              type="number"
              placeholder="$"
              value={form.budget}
              onChange={(e) => setField("budget")(e.target.value)}
            />
          </FormField>
          <FormField label="Quote deadline" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              className={FIELD_CLASS}
              value={form.deadline}
              onChange={setField("deadline")}
              placeholder="Choose Date"
            />
          </FormField>
        </div>

        <FormField label="Notes / requirements" labelClassName={LABEL_CLASS}>
          <Textarea
            className="rounded-sm text-base font-medium min-h-31"
            placeholder="Internal notes visible to brokers only…"
            value={form.notes}
            onChange={(e) => setField("notes")(e.target.value)}
          />
        </FormField>

        <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
          <Button variant="outline" className="gap-2 px-4" onClick={handleClose}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button className="gap-2 px-4" onClick={handleCreate}>
            <Pencil className="size-4" />
            Create Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
