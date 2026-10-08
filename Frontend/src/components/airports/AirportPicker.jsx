"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useAirport, useAirports } from "@/hooks/airports";

/** By code, like every airport list a person picks from. Live airports only (the API's default). */
const PARAMS = { sortBy: "icao", sortOrder: "asc" };

/** `KTEB · Teterboro Airport`, with the city and country beneath. */
function airportOption(airport) {
  return {
    value: airport?.id,
    label: `${airport?.icao} · ${airport?.name}`,
    description: [airport?.city, airport?.country].filter(Boolean).join(", "),
  };
}

/**
 * The airport picker every form uses — `RecordPicker` over the airports
 * list: search by code, IATA, name, city or country, 10 a page by default,
 * paged by the server. Reads need only a session (AGENTS.md, "Reads are open
 * to every signed-in user"), so it works for anyone who can see the form.
 *
 * The server still checks whatever is picked (`AirportsService.usable`).
 */
export default function AirportPicker({ value, onChange, placeholder = "Select an airport", ...props }) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useAirports}
      useOne={useAirport}
      params={PARAMS}
      getOption={airportOption}
      placeholder={placeholder}
      searchPlaceholder="Search code, name or city…"
      itemLabel="airports"
      {...props}
    />
  );
}
