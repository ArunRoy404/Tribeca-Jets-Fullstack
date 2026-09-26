"use client";

import { useMemo } from "react";
import { useClients } from "@/hooks/clients";
import { useAirports } from "@/hooks/airports";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import { LEAD_SOURCES, REQUEST_STATUSES, formatLeadSource, formatRequestStatus } from "@/lib/lead";
import { displayName } from "@/lib/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import PickerSelect from "@/components/trips/PickerSelect";
import DatePicker from "@/components/common/DatePicker";
import { optionalNumber, optionalText } from "@/lib/form";

const FIELD_CLASS = "h-13 px-4 rounded-sm text-base font-medium";
const LABEL_CLASS = "text-[16px] text-foreground mb-2";

/** The shape both callers start from, so neither has to remember the field list. */
export const EMPTY_TRIP_REQUEST_FORM = {
  clientId: "",
  status: "OPEN",
  source: "",
  aircraftPreference: "",
  originAirportId: "",
  destinationAirportId: "",
  departureDate: "",
  returnDate: "",
  passengers: "",
  estimatedValue: "",
  quoteDeadline: "",
  summary: "",
  requirements: "",
  internalNotes: "",
};

/**
 * The fields of an enquiry, shared by every screen that files one.
 *
 * Extracted the moment a second caller needed them: the Trip Requests page and
 * the Operator Sourcing board are both writing a `TripRequest`, and two copies
 * of a twelve-field form drift the first time the API gains a column — which,
 * in a project whose schema is deliberately built module by module, it will.
 *
 * Callers own the state and the submit; this owns the fields, the option lists
 * and the layout. `sections` lets a caller show only the part it means:
 * sourcing does not ask for a status, and the enquiry log does not lead with a
 * quote deadline.
 *
 * **Nothing here defaults a value onto the wire.** Every box starts empty and
 * an untouched field is omitted from the payload, because a form that
 * pre-fills a budget files requests carrying a number nobody agreed.
 */
export default function TripRequestForm({
  form,
  setField,
  enabled = true,
  showStatus = true,
  showSource = true,
  showQuoteDeadline = true,
  showReturnDate = true,
  showNotes = true,
}) {
  // Real records, not a list of names — the payload carries ids, so nothing
  // has to be looked back up by its display text.
  const { data: clients } = useClients({ limit: 100 }, { enabled });
  const { data: airports } = useAirports({ limit: 100 }, { enabled });

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
  const statusOptions = useMemo(
    () =>
      REQUEST_STATUSES.map((value) => ({
        value,
        label: formatRequestStatus(value),
      })),
    [],
  );
  const sourceOptions = useMemo(
    () => LEAD_SOURCES.map((value) => ({ value, label: formatLeadSource(value) })),
    [],
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Client" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form?.clientId}
            onChange={setField?.("clientId")}
            options={clientOptions}
            placeholder="Select client"
            className={FIELD_CLASS}
          />
        </FormField>
        <FormField label="Aircraft needed" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form?.aircraftPreference}
            onChange={setField?.("aircraftPreference")}
            options={categoryOptions}
            placeholder="No preference"
            className={FIELD_CLASS}
          />
        </FormField>
      </div>

      {showStatus || showSource ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          {showStatus ? (
            <FormField label="Status" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <PickerSelect
                value={form?.status}
                onChange={setField?.("status")}
                options={statusOptions}
                placeholder="Open"
                className={FIELD_CLASS}
              />
            </FormField>
          ) : null}
          {showSource ? (
            <FormField
              label="How it came in"
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
            >
              <PickerSelect
                value={form?.source}
                onChange={setField?.("source")}
                options={sourceOptions}
                placeholder="Select source"
                className={FIELD_CLASS}
              />
            </FormField>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Route from" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form?.originAirportId}
            onChange={setField?.("originAirportId")}
            options={airportOptions}
            placeholder="Select departure airport"
            className={FIELD_CLASS}
          />
        </FormField>
        <FormField label="Route to" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <PickerSelect
            value={form?.destinationAirportId}
            onChange={setField?.("destinationAirportId")}
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
            value={form?.departureDate}
            onChange={setField?.("departureDate")}
            placeholder="Choose Date"
          />
        </FormField>
        {/* A present return date is what makes it a round trip — there is no
            separate flag, because two fields that can disagree will. */}
        {showReturnDate ? (
          <FormField label="Return" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              className={FIELD_CLASS}
              value={form?.returnDate}
              onChange={setField?.("returnDate")}
              placeholder="One way"
            />
          </FormField>
        ) : null}
        <FormField label="Passengers" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <Input
            className={FIELD_CLASS}
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="e.g. 4"
            value={form?.passengers ?? ""}
            onChange={(e) => setField?.("passengers")(e.target.value)}
          />
        </FormField>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
        <FormField label="Budget" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <Input
            className={FIELD_CLASS}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="e.g. 28000"
            value={form?.estimatedValue ?? ""}
            onChange={(e) => setField?.("estimatedValue")(e.target.value)}
          />
        </FormField>
        {showQuoteDeadline ? (
          <FormField label="Quote deadline" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              className={FIELD_CLASS}
              value={form?.quoteDeadline}
              onChange={setField?.("quoteDeadline")}
              placeholder="Choose Date"
            />
          </FormField>
        ) : null}
      </div>

      <FormField label="Summary" labelClassName={LABEL_CLASS}>
        <Input
          className={FIELD_CLASS}
          placeholder="e.g. NYC → Miami, business charter"
          value={form?.summary ?? ""}
          onChange={(e) => setField?.("summary")(e.target.value)}
        />
      </FormField>

      <FormField label="Notes / requirements" labelClassName={LABEL_CLASS}>
        <Textarea
          className="rounded-sm text-base font-medium min-h-31"
          placeholder="Catering, ground transport, special requests…"
          value={form?.requirements ?? ""}
          onChange={(e) => setField?.("requirements")(e.target.value)}
        />
      </FormField>

      {/* Deliberately labelled as internal. It is the one field on this form a
          client must never be read, so the label says so rather than relying on
          whoever fills it in to remember. */}
      {showNotes ? (
        <FormField label="Internal notes (never shown to the client)" labelClassName={LABEL_CLASS}>
          <Textarea
            className="rounded-sm text-base font-medium min-h-24"
            placeholder="What the desk needs to remember about this enquiry…"
            value={form?.internalNotes ?? ""}
            onChange={(e) => setField?.("internalNotes")(e.target.value)}
          />
        </FormField>
      ) : null}
    </>
  );
}

/**
 * Turns the form's strings into the API's payload.
 *
 * Shared with the same intent as the fields above: both callers have to make
 * the same three decisions — blank stays absent, a number box that was left
 * empty is not zero, and a cleared date on an edit is `null` rather than `""`.
 * `Number("")` is 0, which is how a budget nobody agreed reaches the pipeline
 * total.
 *
 * `forUpdate` is the difference between the two verbs. On create, an untouched
 * field is simply omitted; on update it has to be sent as `null` to clear what
 * is stored, because an omitted field means "leave it alone".
 */
export function toTripRequestPayload(form, { forUpdate = false } = {}) {
  const blank = forUpdate ? null : undefined;
  const text = (value) => optionalText(value, { editing: forUpdate });
  const number = (value) => optionalNumber(value, { editing: forUpdate });

  return {
    clientId: form?.clientId || undefined,
    status: form?.status || undefined,
    source: form?.source || blank,
    aircraftPreference: form?.aircraftPreference || blank,
    originAirportId: form?.originAirportId || blank,
    destinationAirportId: form?.destinationAirportId || blank,
    departureDate: text(form?.departureDate),
    returnDate: text(form?.returnDate),
    quoteDeadline: text(form?.quoteDeadline),
    passengers: number(form?.passengers),
    estimatedValue: number(form?.estimatedValue),
    summary: text(form?.summary),
    requirements: text(form?.requirements),
    internalNotes: text(form?.internalNotes),
  };
}
