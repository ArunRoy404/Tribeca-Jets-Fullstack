import { formatCalendarDate, formatTime12 } from "@/lib/date";
import { displayName } from "@/lib/client";
import { formatTripReference, formatTripStatus } from "@/lib/trip";

/**
 * Display helpers for Flight Tracking (#14).
 *
 * **Manual by decision** — no flight-data provider. Every status, estimate and
 * link here is what somebody on the desk reported, and the screen says so: a
 * flight nobody has reported on reads "No Update", never "Not Departed", and
 * nothing is called "live". There is no progress bar, because nothing records
 * where a flight is.
 */

const DASH = "—";

export const FLIGHT_STATUSES = ["NOT_DEPARTED", "DELAYED", "IN_FLIGHT", "LANDED", "DIVERTED"];

const STATUS_LABELS = {
  NOT_DEPARTED: "Not Departed",
  DELAYED: "Delayed",
  IN_FLIGHT: "In Flight",
  LANDED: "Landed",
  DIVERTED: "Diverted",
};

/** The label for a reported state; null (nobody has reported) is "No Update". */
export function formatFlightStatus(status) {
  if (!status) return "No Update";
  return STATUS_LABELS[status] ?? status;
}

/** The board's filter over reported states, plus NONE for "nobody has said". */
export const FLIGHT_STATUS_FILTERS = [...FLIGHT_STATUSES, "NONE"];
export const formatFlightStatusFilter = (value) => (value === "NONE" ? "No Update" : formatFlightStatus(value));

/** Which flights the board lists; the URL carries the id. */
export const FLIGHT_WINDOWS = ["ACTIVE", "TODAY", "PAST"];
const WINDOW_LABELS = { ACTIVE: "Active & Upcoming", TODAY: "Departing Today", PAST: "Past Flights" };
export const formatFlightWindow = (value) => WINDOW_LABELS[value] ?? value;

function time12(value) {
  return value ? formatTime12(value) : null;
}

/** "Nov 18, 2026 · 10:00 PM", the day alone when untimed, or a dash. */
function departureLabel(leg) {
  if (!leg?.departureDate) return DASH;
  const day = formatCalendarDate(leg.departureDate);
  return leg?.departureTime ? `${day} · ${formatTime12(leg.departureTime)}` : day;
}

/** One flight — a trip leg — as the board, its cards and its panel read it. */
export function toFlightRow(leg) {
  const trip = leg?.trip;
  const legCount = leg?.legCount ?? 1;
  // The desk's own reported estimate first; the itinerary's planned arrival
  // (outbound only) when nobody has reported one.
  const eta = leg?.estimatedArrival ?? leg?.arrivalTime ?? null;
  return {
    id: leg?.id,
    tripId: trip?.id ?? null,
    reference: formatTripReference(trip?.reference),
    legLabel: legCount > 1 ? `Leg ${leg?.sequence} of ${legCount}` : null,
    client: trip?.client ? displayName(trip.client) : DASH,
    tailNumber: trip?.aircraft?.tailNumber || DASH,
    aircraft: trip?.aircraft?.model || trip?.aircraftDescription || DASH,
    operator: trip?.operator?.name || DASH,
    origin: leg?.originAirport?.icao ?? leg?.originAirport?.iata ?? DASH,
    destination: leg?.destinationAirport?.icao ?? leg?.destinationAirport?.iata ?? DASH,
    departure: departureLabel(leg),
    departureTime: time12(leg?.departureTime) ?? "Time not set",
    eta: eta ? formatTime12(eta) : DASH,
    etaSource: leg?.estimatedArrival ? "reported" : leg?.arrivalTime ? "itinerary" : null,
    flightStatusRaw: leg?.flightStatus ?? null,
    flightStatus: formatFlightStatus(leg?.flightStatus),
    reportedAt: leg?.flightStatusAt ?? null,
    estimatedArrival: leg?.estimatedArrival ?? "",
    trackingUrl: leg?.trackingUrl ?? null,
    tripStatusRaw: trip?.status ?? null,
    tripStatus: formatTripStatus(trip?.status),
    // A report is refused on a cancelled or archived trip — the panel hides the form.
    reportable: trip?.status !== "CANCELLED" && !trip?.deletedAt && !leg?.deletedAt,
  };
}

/** The tiles, from the API's counts. A dash while they load, never a zero. */
export function toFlightStats(stats) {
  const value = (n) => (n === undefined || n === null ? DASH : String(n));
  return [
    { label: "In Flight", value: value(stats?.inFlight), tone: "warning" },
    { label: "Delayed", value: value(stats?.delayed), tone: "destructive" },
    { label: "Departing Today", value: value(stats?.departingToday), tone: "info" },
    { label: "Landed Today", value: value(stats?.landedToday), tone: "success" },
    { label: "No Update Yet", value: value(stats?.awaitingUpdate), tone: "foreground" },
  ];
}
