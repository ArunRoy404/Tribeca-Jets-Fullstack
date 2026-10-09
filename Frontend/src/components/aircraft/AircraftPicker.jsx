"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useAircraftDetail, useAircraftList } from "@/hooks/aircraft";
import { formatAircraftCategory, formatAircraftStatus } from "@/lib/aircraft";

/** By tail number. Live aircraft only (the API's default). */
const PARAMS = { sortBy: "tailNumber", sortOrder: "asc" };

/** `N780EX · Gulfstream G550`, with category, operator and status beneath. */
function aircraftOption(aircraft) {
  return {
    value: aircraft?.id,
    label: aircraft?.tailNumber ? `${aircraft.tailNumber} · ${aircraft?.model || ""}`.trim() : (aircraft?.model || ""),
    description: [
      formatAircraftCategory(aircraft?.category),
      aircraft?.operator?.name || aircraft?.operator,
      formatAircraftStatus(aircraft?.status),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * The aircraft picker every form uses — `RecordPicker` over the aircraft
 * list: search by tail number, model, manufacturer or operator, 10 a page
 * by default, paged by the server.
 *
 * `params` narrows the list for a form that needs a specific subset —
 * a booking form passing `{ status: "AVAILABLE" }` or `{ category: "HEAVY_JET" }`.
 */
export default function AircraftPicker({
  value,
  onChange,
  params,
  placeholder = "Select an aircraft",
  ...props
}) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useAircraftList}
      useOne={useAircraftDetail}
      params={params ? { ...PARAMS, ...params } : PARAMS}
      getOption={aircraftOption}
      placeholder={placeholder}
      searchPlaceholder="Search tail number, model, operator…"
      itemLabel="aircraft"
      {...props}
    />
  );
}
