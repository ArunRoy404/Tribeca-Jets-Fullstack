"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { useCreateTripRequest } from "@/hooks/trip-requests";
import { useClients } from "@/hooks/clients";
import { useAirports } from "@/hooks/airports";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import { displayName } from "@/lib/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

const EMPTY_FORM = {
  clientId: "",
  aircraftPreference: "",
  originAirportId: "",
  destinationAirportId: "",
  departureDate: "",
  estimatedValue: "",
  quoteDeadline: "",
  requirements: "",
};

/**
 * Files an enquiry to be sourced.
 *
 * **This writes a trip request**, because that is what a sourcing request is —
 * the board's rows are enquiries being worked, and there is no separate
 * sourcing table. The only field sourcing adds is the quote deadline.
 *
 * Nothing here defaults a value. The dialog used to send `broker: "Ari"`,
 * `"TBD"` routes and `"$0"` for an empty budget, so every request created
 * through it carried a broker nobody assigned and a zero budget that fed
 * straight into the desk's pipeline total.
 */
export default function NewSourcingRequestDialog() {
  const open = useOperatorSourcingStore((s) => s.newRequestOpen);
  const closeNewRequest = useOperatorSourcingStore((s) => s.closeNewRequest);
  const { mutate: createRequest, isPending } = useCreateTripRequest();

  const [form, setForm] = useState(EMPTY_FORM);
  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Real records, not a list of first names.
  const { data: clients } = useClients({ limit: 100 }, { enabled: open });
  const { data: airports } = useAirports({ limit: 100 }, { enabled: open });

  // PickerSelect takes { label, value } pairs, so the id is the value and
  // nothing has to be looked back up by its display text.
  const clientOptions = useMemo(
    () => (clients?.data ?? []).map((c) => ({ value: c.id, label: displayName(c) })),
    [clients?.data],
  );
  const airportOptions = useMemo(
    () =>
      (airports?.data ?? []).map((a) => ({
        value: a.id,
        label: `${a.icao} · ${a.city ?? a.name}`,
      })),
    [airports?.data],
  );
  const categoryOptions = useMemo(
    () =>
      FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => ({
        value,
        label: formatAircraftCategory(value),
      })),
    [],
  );

  const handleClose = () => {
    setForm(EMPTY_FORM);
    closeNewRequest();
  };

  const handleCreate = () => {
    if (!form.clientId) return;

    // Blank stays blank. An empty number box sends "", which Number() turns
    // into 0 — a budget of $0 the desk never agreed.
    const optional = (value) => {
      const trimmed = String(value ?? "").trim();
      return trimmed || undefined;
    };

    createRequest(
      {
        clientId: form.clientId,
        status: "OPEN",
        originAirportId: form.originAirportId || null,
        destinationAirportId: form.destinationAirportId || null,
        departureDate: optional(form.departureDate),
        quoteDeadline: optional(form.quoteDeadline),
        aircraftPreference: optional(form.aircraftPreference),
        estimatedValue: form.estimatedValue
          ? Number(form.estimatedValue)
          : undefined,
        requirements: optional(form.requirements),
      },
      { onSuccess: handleClose },
    );
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
              File the enquiry, then send it out to operators
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Client" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.clientId}
              onChange={setField("clientId")}
              options={clientOptions}
              placeholder="Select client"
              className={FIELD_CLASS}
            />
          </FormField>
          <FormField label="Aircraft needed" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.aircraftPreference}
              onChange={setField("aircraftPreference")}
              options={categoryOptions}
              placeholder="Select Aircraft"
              className={FIELD_CLASS}
            />
          </FormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Route from" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.originAirportId}
              onChange={setField("originAirportId")}
              options={airportOptions}
              placeholder="Select departure airport"
              className={FIELD_CLASS}
            />
          </FormField>
          <FormField label="Route to" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <PickerSelect
              value={form.destinationAirportId}
              onChange={setField("destinationAirportId")}
              options={airportOptions}
              placeholder="Select arrival airport"
              className={FIELD_CLASS}
            />
          </FormField>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <FormField label="Departure" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              className={FIELD_CLASS}
              value={form.departureDate}
              onChange={setField("departureDate")}
              placeholder="Choose Date"
            />
          </FormField>
          <FormField label="Budget" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <Input
              className={FIELD_CLASS}
              type="number"
              min="0"
              placeholder="e.g. 28000"
              value={form.estimatedValue}
              onChange={(e) => setField("estimatedValue")(e.target.value)}
            />
          </FormField>
          <FormField label="Quote deadline" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              className={FIELD_CLASS}
              value={form.quoteDeadline}
              onChange={setField("quoteDeadline")}
              placeholder="Choose Date"
            />
          </FormField>
        </div>

        <FormField label="Notes / requirements" labelClassName={LABEL_CLASS}>
          <Textarea
            className="rounded-sm text-base font-medium min-h-31"
            placeholder="Catering, ground transport, special requests…"
            value={form.requirements}
            onChange={(e) => setField("requirements")(e.target.value)}
          />
        </FormField>

        <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
          <Button variant="outline" className="gap-2 px-4 cursor-pointer" onClick={handleClose}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            className="gap-2 px-4 cursor-pointer"
            disabled={isPending || !form.clientId}
            onClick={handleCreate}
          >
            <Pencil className="size-4" />
            Create Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
