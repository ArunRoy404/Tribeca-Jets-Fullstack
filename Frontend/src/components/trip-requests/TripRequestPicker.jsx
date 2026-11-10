"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useTripRequest, useTripRequests } from "@/hooks/trip-requests";
import { personName } from "@/lib/lead";

const PARAMS = { sortBy: "createdAt", sortOrder: "desc" };

function requestOption(request) {
  const client = request?.client?.companyName || personName(request?.client) || "Client";
  return {
    value: request?.id,
    label: `TR-${request?.reference} · ${client}`,
    description: `${request?.originAirport?.icao || "—"} → ${request?.destinationAirport?.icao || "—"}`,
  };
}

/**
 * The trip request picker — `RecordPicker` over the enquiries the caller may
 * see, searched and paged by the server (10 Nov 2026). `params` narrows it
 * (`{ openOnly: true }` for forms that link a live enquiry). `onChange` gets
 * the picked row as its second argument, for forms that pre-fill from it.
 */
export default function TripRequestPicker({ value, onChange, placeholder = "Select an enquiry", params, ...props }) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useTripRequests}
      useOne={useTripRequest}
      params={params ? { ...PARAMS, ...params } : PARAMS}
      getOption={requestOption}
      placeholder={placeholder}
      searchPlaceholder="Search TR-1042, client, route…"
      itemLabel="enquiries"
      {...props}
    />
  );
}
