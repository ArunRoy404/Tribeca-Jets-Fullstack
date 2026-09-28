import { formatTimestamp, toArchiveFields } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { displayName } from "@/lib/client";
import { formatRequestStatus, personName } from "@/lib/lead";

/**
 * Display helpers for Empty Legs (#10b).
 *
 * `status` arrives already *as read*: an open leg past its expiry comes back
 * EXPIRED with `lapsed: true`, so nothing here compares clocks. Match counts
 * are the API's too — a trip request on the same route, and those within three
 * days of the departure.
 */

const DASH = "—";

export const EMPTY_LEG_STATUSES = ["AVAILABLE", "MATCHED", "BOOKED", "EXPIRED"];

const STATUS_LABELS = {
  AVAILABLE: "Available",
  MATCHED: "Matched",
  BOOKED: "Booked",
  EXPIRED: "Expired",
};

export function formatEmptyLegStatus(status) {
  if (!status) return DASH;
  return STATUS_LABELS[status] ?? status;
}

/** "EL-1001", the way the desk says it. */
export function formatEmptyLegReference(reference) {
  return reference === null || reference === undefined ? DASH : `EL-${reference}`;
}

const code = (airport) => airport?.icao ?? airport?.iata ?? DASH;

/** "N780EX · Gulfstream G550", the free-text description, or a dash. */
function aircraftLabel(leg) {
  if (leg?.aircraft) return [leg.aircraft.tailNumber, leg.aircraft.model].filter(Boolean).join(" · ") || DASH;
  return leg?.aircraftDescription || DASH;
}

/** A row on the board, or a card. */
export function toEmptyLegRow(leg) {
  const day = formatCalendarDate(leg?.departureDate);
  return {
    id: leg?.id,
    reference: formatEmptyLegReference(leg?.reference),
    origin: code(leg?.originAirport),
    originName: leg?.originAirport?.city || leg?.originAirport?.name || DASH,
    destination: code(leg?.destinationAirport),
    destinationName: leg?.destinationAirport?.city || leg?.destinationAirport?.name || DASH,
    date: leg?.departureTime ? `${day} · ${leg.departureTime}` : day,
    aircraft: aircraftLabel(leg),
    operator: leg?.operator?.name ?? DASH,
    price: formatMoney(leg?.price),
    seats: leg?.seats ?? null,
    // No expiry on file is an open-ended offer, not an unknown one.
    expiry: leg?.expiresAt ? formatTimestamp(leg.expiresAt) : "No expiry",
    status: formatEmptyLegStatus(leg?.status),
    rawStatus: leg?.status ?? null,
    lapsed: Boolean(leg?.lapsed),
    matchCount: leg?.matchCount ?? 0,
    dateMatchCount: leg?.dateMatchCount ?? 0,
    notes: leg?.notes ?? null,
    raw: leg,
    ...toArchiveFields(leg),
  };
}

/**
 * The detail sheet: the row, plus #10b's list of people to call — each trip
 * request on the route, with its client's contact details and how close the
 * requested day was.
 */
export function toEmptyLegDetail(leg) {
  return {
    ...toEmptyLegRow(leg),
    matches: (leg?.matches ?? []).map((match) => ({
      id: match?.id,
      reference: match?.reference ? `TR-${match.reference}` : DASH,
      clientId: match?.client?.id ?? null,
      clientName: match?.client ? displayName(match.client) : DASH,
      clientEmail: match?.client?.email ?? null,
      clientPhone: match?.client?.phone ?? null,
      status: formatRequestStatus(match?.status) || DASH,
      requestedDate: formatCalendarDate(match?.departureDate),
      askedOn: formatCalendarDate(match?.createdAt),
      dayGap: match?.dayGap ?? null,
      dateMatch: Boolean(match?.dateMatch),
      archived: Boolean(match?.archived),
      broker: match?.assignedBroker ? personName(match.assignedBroker) : "Unassigned",
    })),
  };
}
