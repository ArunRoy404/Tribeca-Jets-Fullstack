import { toArchiveFields } from "@/lib/archive";

/**
 * Display helpers for airports.
 *
 * Airports carry no enums, so this is mostly about rendering absent values
 * honestly: the table used to fall back to a hardcoded FBO name, which invented
 * data for any airport that had none.
 */

const DASH = "—";

/** Feet, thousands-separated. Null means unknown, not zero. */
export function formatRunway(feet) {
  if (feet === null || feet === undefined || feet === "") return DASH;
  const number = Number(feet);
  if (!Number.isFinite(number)) return DASH;
  return `${number.toLocaleString()} ft`;
}

/** `KTEB / TEB`, or just the ICAO when there is no IATA code. */
export function formatCodes(airport) {
  const icao = airport?.icao ?? "";
  return airport?.iata ? `${icao} / ${airport.iata}` : icao;
}

/** Signed decimal degrees, or a dash. Kept to 4 places for display. */
export function formatCoordinate(value) {
  if (value === null || value === undefined) return DASH;
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(4) : DASH;
}

/** Maps one API airport onto the props the table, cards and sidebar render. */
export function toAirportRow(airport) {
  return {
    id: airport?.id,
    icao: airport?.icao,
    iata: airport?.iata ?? null,
    codes: formatCodes(airport),
    name: airport?.name,
    city: airport?.city,
    state: airport?.state ?? null,
    country: airport?.country,

    latitude: airport?.latitude ?? null,
    longitude: airport?.longitude ?? null,
    latitudeLabel: formatCoordinate(airport?.latitude),
    longitudeLabel: formatCoordinate(airport?.longitude),

    longestRunwayFt: airport?.longestRunwayFt ?? null,
    runwayLabel: formatRunway(airport?.longestRunwayFt),

    // An em dash, never an invented FBO name. The row used to default to
    // "Signature Flight Support" for any airport without one, which reads as
    // fact and is not.
    assignedFbo: airport?.assignedFbo || DASH,
    notes: airport?.notes ?? "",

    // Audit trail, present on every record in every module.
    createdAt: airport?.createdAt ?? null,
    updatedAt: airport?.updatedAt ?? null,

    // Archive trail: who removed it, who brought it back, and whether the
    // live row should carry the "Restored" badge.
    ...toArchiveFields(airport),
  };
}
