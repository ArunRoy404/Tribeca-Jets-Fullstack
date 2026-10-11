"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useTrip, useTrips } from "@/hooks/trips";
import { toTripRow } from "@/lib/trip";

const PARAMS = { sortBy: "departureDate", sortOrder: "desc" };

function tripOption(trip) {
  const row = toTripRow(trip);
  const title = `${row.reference} · ${row.client}`;
  const description = [
    row.route,
    row.departure !== "—" ? row.departure : null,
    row.aircraft !== "—" ? row.aircraft : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    value: trip?.id,
    label: title,
    description,
    badge: row.status,
  };
}

/**
 * The trip picker every form uses — `RecordPicker` over the real
 * trips directory: live search by TJ reference, client, tail, or operator,
 * paged by server.
 */
export default function TripPicker({
  value,
  onChange,
  placeholder = "Select a trip",
  ...props
}) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useTrips}
      useOne={useTrip}
      params={PARAMS}
      getOption={tripOption}
      placeholder={placeholder}
      searchPlaceholder="Search trip reference (TJ-1048), client, tail, route…"
      itemLabel="trips"
      {...props}
    />
  );
}
