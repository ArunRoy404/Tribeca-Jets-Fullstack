"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { useCreateTripRequest, useTripRequests } from "@/hooks/trip-requests";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import ClientPicker from "@/components/clients/ClientPicker";
import AirportPicker from "@/components/airports/AirportPicker";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import { optionalNumber, optionalText } from "@/lib/form";

const FIELD_CLASS = "h-11 px-3.5 rounded-md text-sm font-medium";
const LABEL_CLASS = "text-[13px] font-semibold text-foreground mb-1.5";

const EMPTY_FORM = {
  linkedTripId: "",
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
 * Files an enquiry to be sourced, matching Figma's dedicated 8-field layout:
 * - Linked trip selector (auto-populates if linked to an existing request)
 * - Client & Aircraft needed
 * - Route from & Route to
 * - Departure, Budget & Quote deadline
 * - Notes / requirements
 */
export default function NewSourcingRequestDialog() {
  const open = useOperatorSourcingStore((s) => s.newRequestOpen);
  const closeNewRequest = useOperatorSourcingStore((s) => s.closeNewRequest);
  const { mutate: createRequest, isPending } = useCreateTripRequest();

  // Load open requests to allow quick linking/pre-filling
  const { data: openRequestsData } = useTripRequests(
    { openOnly: true, limit: 100 },
    { enabled: open },
  );

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  const setField = (field) => (value) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Select Aircraft Category" },
      ...FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => ({
        value,
        label: formatAircraftCategory(value),
      })),
    ],
    [],
  );

  const linkedTripOptions = useMemo(() => {
    const list = openRequestsData?.data ?? [];
    return [
      { value: "", label: "Select an open trip / enquiry (or create new)" },
      ...list.map((r) => ({
        value: r.id,
        label: `TR-${r.reference} · ${r.client?.companyName || r.client?.contactName || "Client"} · ${r.originAirport?.icao || "—"} → ${r.destinationAirport?.icao || "—"}`,
      })),
    ];
  }, [openRequestsData?.data]);

  const handleLinkedTripChange = (tripId) => {
    setField("linkedTripId")(tripId);
    if (!tripId) return;
    const found = openRequestsData?.data?.find((r) => r.id === tripId);
    if (!found) return;

    setForm((prev) => ({
      ...prev,
      linkedTripId: tripId,
      clientId: found.clientId || prev.clientId,
      aircraftPreference: found.aircraftPreference || prev.aircraftPreference,
      originAirportId: found.originAirportId || prev.originAirportId,
      destinationAirportId: found.destinationAirportId || prev.destinationAirportId,
      departureDate: found.departureDate ? found.departureDate.slice(0, 10) : prev.departureDate,
      estimatedValue: found.estimatedValue != null ? String(found.estimatedValue) : prev.estimatedValue,
      quoteDeadline: found.quoteDeadline ? found.quoteDeadline.slice(0, 10) : prev.quoteDeadline,
      requirements: found.requirements || found.summary || prev.requirements,
    }));
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    closeNewRequest();
  };

  const handleCreate = (e) => {
    e?.preventDefault();

    const errors = {};
    if (!form.clientId) errors.clientId = "Please select a client";
    if (!form.originAirportId) errors.originAirportId = "Departure airport is required";
    if (!form.destinationAirportId) errors.destinationAirportId = "Arrival airport is required";
    if (!form.departureDate) errors.departureDate = "Departure date is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    createRequest(
      {
        clientId: form.clientId,
        aircraftPreference: form.aircraftPreference || undefined,
        originAirportId: form.originAirportId || undefined,
        destinationAirportId: form.destinationAirportId || undefined,
        departureDate: optionalText(form.departureDate),
        estimatedValue: optionalNumber(form.estimatedValue),
        quoteDeadline: optionalText(form.quoteDeadline),
        requirements: optionalText(form.requirements),
        status: "OPEN",
      },
      {
        onSuccess: handleClose,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-4xl rounded-2xl p-6 gap-4 max-h-[92vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-3 w-full">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground leading-none">
              New Sourcing Request
            </DialogTitle>
            <p className="font-montserrat font-medium text-[13px] text-muted-foreground">
              Send a request to operators for trip quote
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4 w-full pt-1">
          {/* Linked trip */}
          <FormField label="Linked trip" labelClassName={LABEL_CLASS}>
            <CommonSelect
              value={form.linkedTripId}
              onChange={handleLinkedTripChange}
              options={linkedTripOptions}
              placeholder="Select a trip"
            />
          </FormField>

          {/* Client & Aircraft needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
            <FormField
              label="Client *"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
              error={fieldErrors.clientId}
            >
              <ClientPicker
                value={form.clientId}
                onChange={(val) => setField("clientId")(val || "")}
                placeholder="Select client"
              />
            </FormField>

            <FormField
              label="Aircraft needed"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
            >
              <CommonSelect
                value={form.aircraftPreference}
                onChange={setField("aircraftPreference")}
                options={categoryOptions}
                placeholder="Select Aircraft"
              />
            </FormField>
          </div>

          {/* Route from & Route to */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
            <FormField
              label="Route from *"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
              error={fieldErrors.originAirportId}
            >
              <AirportPicker
                value={form.originAirportId}
                onChange={(val) => setField("originAirportId")(val || "")}
                placeholder="Select departure airport"
              />
            </FormField>

            <FormField
              label="Route to *"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
              error={fieldErrors.destinationAirportId}
            >
              <AirportPicker
                value={form.destinationAirportId}
                onChange={(val) => setField("destinationAirportId")(val || "")}
                placeholder="Select arrival airport"
              />
            </FormField>
          </div>

          {/* Departure, Budget, Quote deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start w-full">
            <FormField
              label="Departure *"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
              error={fieldErrors.departureDate}
            >
              <DatePicker
                value={form.departureDate}
                onChange={setField("departureDate")}
                placeholder="Choose Date"
              />
            </FormField>

            <FormField label="Budget ($)" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <Input
                className={FIELD_CLASS}
                type="number"
                min="0"
                placeholder="e.g. 25000"
                value={form.estimatedValue}
                onChange={(e) => setField("estimatedValue")(e.target.value)}
              />
            </FormField>

            <FormField label="Quote deadline" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <DatePicker
                value={form.quoteDeadline}
                onChange={setField("quoteDeadline")}
                placeholder="Choose Date"
              />
            </FormField>
          </div>

          {/* Notes / requirements */}
          <FormField label="Notes / requirements" labelClassName={LABEL_CLASS}>
            <Textarea
              className="rounded-md text-sm font-medium min-h-24 resize-none"
              placeholder="Internal notes visible to brokers only…"
              value={form.requirements}
              onChange={(e) => setField("requirements")(e.target.value)}
            />
          </FormField>

          <div className="border-t border-secondary flex gap-2 items-center justify-end pt-4 w-full mt-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 px-4 cursor-pointer"
              onClick={handleClose}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 px-4 cursor-pointer shadow-button"
              disabled={isPending}
            >
              <Pencil className="size-4" />
              {isPending ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
