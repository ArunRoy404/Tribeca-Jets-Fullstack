"use client";

import { useMemo } from "react";
import ClientPicker from "@/components/clients/ClientPicker";
import AirportPicker from "@/components/airports/AirportPicker";
import BrokerPicker from "@/components/users/BrokerPicker";
import CommonSelect from "@/components/common/CommonSelect";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import {
  LEAD_FORM_SOURCES,
  REQUEST_STATUSES,
  formatLeadSource,
  formatRequestStatus,
} from "@/lib/lead";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/trips/FormField";
import DatePicker from "@/components/common/DatePicker";
import { optionalNumber, optionalText } from "@/lib/form";
import { usePermissions } from "@/hooks/common/usePermissions";
import { useCurrentUser } from "@/hooks/auth";
import { Action, Module, Reach } from "@/lib/access";
import { isAdministratorRole } from "@/lib/roles";

const FIELD_CLASS = "h-11 px-3.5 rounded-md text-sm font-medium";
const LABEL_CLASS = "text-[13px] font-semibold text-foreground mb-1.5";

/** The shape both callers start from, so neither has to remember the field list. */
export const EMPTY_TRIP_REQUEST_FORM = {
  clientId: "",
  assignedBrokerId: "",
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
 * Uses shared pickers: ClientPicker, AirportPicker, BrokerPicker, and CommonSelect.
 * Paged and searched server-side.
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
  const { canAccess, reachOf } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const mayAssignBroker =
    canAccess(Module.TRIP_REQUESTS, Action.ASSIGN) ||
    canAccess(Module.LEADS_AGENTS, Action.ASSIGN) ||
    reachOf(Module.TRIP_REQUESTS) === Reach.ALL ||
    isAdministratorRole(currentUser?.role);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "No preference" },
      ...FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => ({
        value,
        label: formatAircraftCategory(value),
      })),
    ],
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
    () => [
      { value: "", label: "Not recorded" },
      ...LEAD_FORM_SOURCES.map((value) => ({
        value,
        label: formatLeadSource(value),
      })),
    ],
    [],
  );

  const handleClientChange = (clientId, rawClient) => {
    setField?.("clientId")(clientId || "");
    if (rawClient) {
      if (rawClient.assignedBrokerId && mayAssignBroker) {
        setField?.("assignedBrokerId")(rawClient.assignedBrokerId);
      }
      if (rawClient.leadSource && !form?.source && showSource) {
        setField?.("source")(rawClient.leadSource);
      }
      if (rawClient.homeAirportId && !form?.originAirportId) {
        setField?.("originAirportId")(rawClient.homeAirportId);
      }
    }
  };

  const handleDepartureDateChange = (val) => {
    setField?.("departureDate")(val);
    if (val && form?.returnDate && form.returnDate < val) {
      setField?.("returnDate")(val);
    }
  };

  const isDateInvalid = Boolean(
    form?.departureDate && form?.returnDate && form.departureDate > form.returnDate,
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
        <FormField label="Client *" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <ClientPicker
            value={form?.clientId}
            onChange={handleClientChange}
            placeholder="Select client"
          />
        </FormField>

        {mayAssignBroker ? (
          <FormField label="Assigned Broker" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <BrokerPicker
              value={form?.assignedBrokerId}
              onChange={(val) => setField?.("assignedBrokerId")(val || "")}
              placeholder="Unassigned"
            />
          </FormField>
        ) : (
          <FormField label="Aircraft needed" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <CommonSelect
              value={form?.aircraftPreference}
              onChange={setField?.("aircraftPreference")}
              options={categoryOptions}
              placeholder="No preference"
            />
          </FormField>
        )}
      </div>

      {mayAssignBroker ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
          <FormField label="Aircraft needed" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <CommonSelect
              value={form?.aircraftPreference}
              onChange={setField?.("aircraftPreference")}
              options={categoryOptions}
              placeholder="No preference"
            />
          </FormField>
          {showStatus ? (
            <FormField label="Status" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <CommonSelect
                value={form?.status}
                onChange={setField?.("status")}
                options={statusOptions}
                placeholder="Open"
              />
            </FormField>
          ) : null}
        </div>
      ) : null}

      {(!mayAssignBroker && (showStatus || showSource)) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
          {showStatus ? (
            <FormField label="Status" labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
              <CommonSelect
                value={form?.status}
                onChange={setField?.("status")}
                options={statusOptions}
                placeholder="Open"
              />
            </FormField>
          ) : null}
          {showSource ? (
            <FormField
              label="How it came in"
              optional
              labelClassName={LABEL_CLASS}
              className="flex-1 min-w-0"
            >
              <CommonSelect
                value={form?.source}
                onChange={setField?.("source")}
                options={sourceOptions}
                placeholder="Select source"
              />
            </FormField>
          ) : null}
        </div>
      ) : mayAssignBroker && showSource ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
          <FormField
            label="How it came in"
            optional
            labelClassName={LABEL_CLASS}
            className="flex-1 min-w-0"
          >
            <CommonSelect
              value={form?.source}
              onChange={setField?.("source")}
              options={sourceOptions}
              placeholder="Select source"
            />
          </FormField>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
        <FormField label="Route from (Origin)" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <AirportPicker
            value={form?.originAirportId}
            onChange={(val) => setField?.("originAirportId")(val || "")}
            placeholder="Select departure airport"
          />
        </FormField>
        <FormField label="Route to (Destination)" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
          <AirportPicker
            value={form?.destinationAirportId}
            onChange={(val) => setField?.("destinationAirportId")(val || "")}
            placeholder="Select arrival airport"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start w-full">
        <FormField
          label="Departure Date"
          labelClassName={LABEL_CLASS}
          className="flex-1 min-w-0"
          error={isDateInvalid ? "Departure date cannot be after return date" : undefined}
        >
          <DatePicker
            value={form?.departureDate}
            onChange={handleDepartureDateChange}
            maxDate={form?.returnDate || undefined}
            placeholder="Choose Date"
          />
        </FormField>

        {showReturnDate ? (
          <FormField
            label="Return Date"
            optional
            labelClassName={LABEL_CLASS}
            className="flex-1 min-w-0"
            error={isDateInvalid ? "Return date must be on or after departure date" : undefined}
          >
            <DatePicker
              value={form?.returnDate}
              onChange={setField?.("returnDate")}
              minDate={form?.departureDate || undefined}
              placeholder="One way"
            />
          </FormField>
        ) : null}

        <FormField label="Passengers" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start w-full">
        <FormField label="Estimated Budget ($)" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
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
          <FormField label="Quote Deadline" optional labelClassName={LABEL_CLASS} className="flex-1 min-w-0">
            <DatePicker
              value={form?.quoteDeadline}
              onChange={setField?.("quoteDeadline")}
              placeholder="Choose Date"
            />
          </FormField>
        ) : null}
      </div>

      <FormField label="Summary" optional labelClassName={LABEL_CLASS}>
        <Input
          className={FIELD_CLASS}
          placeholder="e.g. NYC → Miami, business charter"
          value={form?.summary ?? ""}
          onChange={(e) => setField?.("summary")(e.target.value)}
        />
      </FormField>

      <FormField label="Notes / Requirements" optional labelClassName={LABEL_CLASS}>
        <Textarea
          className="rounded-md text-sm font-medium min-h-24"
          placeholder="Catering, ground transport, special requests…"
          value={form?.requirements ?? ""}
          onChange={(e) => setField?.("requirements")(e.target.value)}
        />
      </FormField>

      {showNotes ? (
        <FormField label="Internal Notes (never shown to client)" optional labelClassName={LABEL_CLASS}>
          <Textarea
            className="rounded-md text-sm font-medium min-h-20"
            placeholder="What the desk needs to remember about this enquiry…"
            value={form?.internalNotes ?? ""}
            onChange={(e) => setField?.("internalNotes")(e.target.value)}
          />
        </FormField>
      ) : null}
    </div>
  );
}

/**
 * Turns the form's strings into the API's payload.
 */
export function toTripRequestPayload(form, { forUpdate = false } = {}) {
  const blank = forUpdate ? null : undefined;
  const text = (value) => optionalText(value, { editing: forUpdate });
  const number = (value) => optionalNumber(value, { editing: forUpdate });

  return {
    clientId: form?.clientId || undefined,
    assignedBrokerId: form?.assignedBrokerId ? form.assignedBrokerId : blank,
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
