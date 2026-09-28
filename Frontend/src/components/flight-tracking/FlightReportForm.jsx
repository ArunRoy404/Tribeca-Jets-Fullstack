"use client";

import { useState } from "react";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import TimePicker from "@/components/common/TimePicker";
import FormField from "@/components/trips/FormField";
import { Button } from "@/components/ui/button";
import { useUpdateFlight } from "@/hooks/flight-tracking";
import { FLIGHT_STATUSES, formatFlightStatus } from "@/lib/flight";

const STATUS_OPTIONS = FLIGHT_STATUSES.map((value) => ({ value, label: formatFlightStatus(value) }));

/**
 * What the desk has heard about a flight — status, the operator's arrival
 * estimate, a public tracking link, and a note. Manual by decision: nothing
 * here is fetched. Only what changed is sent, and a blank estimate or link
 * clears it; the API refuses a report that would change nothing.
 *
 * Parents remount this with a `key` per flight and report, so the draft
 * always starts from what is stored.
 */
export default function FlightReportForm({ flight }) {
  const { mutate, isPending } = useUpdateFlight();
  const [form, setForm] = useState({
    flightStatus: flight?.flightStatusRaw ?? "",
    estimatedArrival: flight?.estimatedArrival ?? "",
    trackingUrl: flight?.trackingUrl ?? "",
    note: "",
  });
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value?.target ? value.target.value : value }));

  const payload = {};
  if (form.flightStatus && form.flightStatus !== (flight?.flightStatusRaw ?? "")) payload.flightStatus = form.flightStatus;
  if (form.estimatedArrival !== (flight?.estimatedArrival ?? "")) payload.estimatedArrival = form.estimatedArrival || null;
  const link = form.trackingUrl.trim();
  if (link !== (flight?.trackingUrl ?? "")) payload.trackingUrl = link || null;
  if (form.note.trim()) payload.note = form.note.trim();
  const changed = Object.keys(payload).length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!changed) return;
    mutate({ id: flight?.id, ...payload });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 w-full bg-secondary/40 border border-border rounded-lg p-3.5">
      <div className="flex flex-col gap-0.5">
        <p className="font-montserrat font-bold text-[14px] text-foreground">Report on this flight</p>
        <p className="font-montserrat text-[11px] text-muted-foreground">
          Entered by hand from what the operator reports — there is no live feed.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <FormField label="Flight status">
          <CommonSelect value={form.flightStatus} onChange={set("flightStatus")} options={STATUS_OPTIONS} placeholder="No update yet" />
        </FormField>
        <FormField label="Estimated arrival (Optional)">
          <TimePicker value={form.estimatedArrival} onChange={set("estimatedArrival")} placeholder="Local at destination" />
        </FormField>
      </div>
      <CommonInput
        name="trackingUrl"
        label="Tracking link (Optional)"
        placeholder="https://flightaware.com/live/flight/N780EX"
        value={form.trackingUrl}
        onChange={set("trackingUrl")}
      />
      <CommonInput
        type="textarea"
        name="note"
        label="What was reported (Optional)"
        placeholder="e.g. 30-minute ground hold at the origin, weather"
        value={form.note}
        onChange={set("note")}
      />
      <Button type="submit" disabled={!changed || isPending} className="w-full">
        {isPending ? "Saving…" : "Save Update"}
      </Button>
    </form>
  );
}
