import { toArchiveFields, formatTimestamp } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatTime24 } from "@/lib/time";
import { displayName } from "@/lib/client";
import { formatTripStatus } from "@/lib/trip";

/**
 * Display helpers for Itineraries (#12).
 *
 * Aircraft, operator, tail, route and the passenger manifest all arrive
 * already read from the trip — nothing here recomputes them. `exteriorImageUrl`
 * / `interiorImageUrl` and `departureFbo` / `arrivalFbo` are the API's
 * computed *effective* values (a document override, or the trip's aircraft /
 * the airport's assigned default); the raw override rides along separately
 * for the edit form, under the `*Override` keys.
 */

const DASH = "—";

export const ITINERARY_STATUSES = ["PENDING", "CONFIRMED"];

const STATUS_LABELS = { PENDING: "Pending", CONFIRMED: "Confirmed" };

export function formatItineraryStatus(status) {
  if (!status) return DASH;
  return STATUS_LABELS[status] ?? status;
}

const code = (airport) => airport?.icao ?? DASH;

/** "N780EX · Gulfstream G550", the free-text description, or a dash. */
function aircraftLabel(item) {
  if (item?.aircraft) return [item.aircraft.tailNumber, item.aircraft.model].filter(Boolean).join(" · ") || DASH;
  return item?.aircraftDescription || DASH;
}

/** A row on the board, a card, or the detail/preview panel — one shape for all three. */
export function toItineraryRow(item) {
  const dateLabel = item?.departureDate ? formatCalendarDate(item.departureDate) : null;

  return {
    id: item?.id,
    tripId: item?.tripId,
    tripReference: item?.tripReference ?? DASH,

    client: item?.client ? displayName(item.client) : DASH,
    clientId: item?.clientId ?? null,

    originCode: code(item?.originAirport),
    destinationCode: code(item?.destinationAirport),
    route: `${code(item?.originAirport)} → ${code(item?.destinationAirport)}`,

    departure: dateLabel ? `${dateLabel}${item?.departureTime ? ` · ${item.departureTime}` : ""}` : DASH,
    departureDateLabel: dateLabel ?? DASH,
    departureTime: item?.departureTime ?? null,
    arrivalTime: item?.arrivalTime ?? null,
    arrivalTimeLabel: item?.arrivalTime ? formatTime24(item.arrivalTime) : DASH,

    aircraft: aircraftLabel(item),
    aircraftTail: item?.aircraft?.tailNumber ?? DASH,
    operator: item?.operator?.name ?? DASH,

    flightTime: item?.flightTime || DASH,
    miles: item?.miles || DASH,

    passengers: item?.passengers ?? [],
    passengerCount: item?.passengerCount ?? 0,

    catering: item?.catering || DASH,
    groundTransport: item?.groundTransport || DASH,

    departureFbo: item?.departureFbo || DASH,
    arrivalFbo: item?.arrivalFbo || DASH,
    /** Raw stored override, for the edit form — "" (not DASH) so the input binds cleanly. */
    departureFboOverride: item?.departureFboOverride ?? "",
    arrivalFboOverride: item?.arrivalFboOverride ?? "",

    operatorItineraryUrl: item?.operatorItineraryUrl ?? null,
    operatorItineraryText: item?.operatorItineraryText || "",

    exteriorImageUrl: item?.exteriorImageUrl ?? null,
    interiorImageUrl: item?.interiorImageUrl ?? null,
    exteriorImageOverride: item?.exteriorImageOverride ?? "",
    interiorImageOverride: item?.interiorImageOverride ?? "",

    logoUrl: item?.logoUrl ?? null,
    notes: item?.notes || "",

    tripStatus: formatTripStatus(item?.tripStatus),
    rawTripStatus: item?.tripStatus ?? null,
    tripArchived: Boolean(item?.tripArchived),

    status: formatItineraryStatus(item?.status),
    rawStatus: item?.status ?? null,
    confirmed: Boolean(item?.confirmed),
    confirmedAt: item?.confirmedAt ?? null,

    sentAt: item?.sentAt ?? null,
    sentAtLabel: item?.sentAt ? formatTimestamp(item.sentAt) : null,

    raw: item,
    ...toArchiveFields(item),
  };
}
