import { toArchiveFields } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { personName } from "@/lib/lead";
import { displayName } from "@/lib/client";
import { formatAircraftCategory } from "@/lib/aircraft";
import { toTripPayment } from "@/lib/receivable";
import { toTripOperatorPayment } from "@/lib/operatorPayment";

/**
 * Display helpers for Trips (#11).
 *
 * The same rule as quotes: **every money figure except the inputs is computed
 * by the API on read** — FET, total, profit, margin — and nothing here
 * recalculates them. A trip with no price yet arrives with every computed
 * figure null, and renders as an em dash, never "$0".
 *
 * Operator cost, profit and margin are *absent* (undefined) for a caller
 * without VIEW_FINANCIALS; the mapper turns absence into the em dash too, so
 * a component never has to know which of the two it was.
 */

const DASH = "—";

/** Every trip state, in lifecycle order — for the board's filter. */
export const TRIP_STATUSES = ["DRAFT", "BOOKED", "CONFIRMED", "IN_FLIGHT", "COMPLETED", "CANCELLED"];

const STATUS_LABELS = {
  DRAFT: "Draft",
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  IN_FLIGHT: "In Flight",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function formatTripStatus(status) {
  if (!status) return DASH;
  return STATUS_LABELS[status] ?? status;
}

export const TRIP_TYPES = ["ONE_WAY", "ROUND_TRIP", "MULTI_LEG"];
const TYPE_LABELS = { ONE_WAY: "One Way", ROUND_TRIP: "Round Trip", MULTI_LEG: "Multi Leg" };

export function formatTripType(type) {
  if (!type) return DASH;
  return TYPE_LABELS[type] ?? type;
}

/** The verb on a button that moves a trip into a status. */
const MOVE_VERBS = {
  DRAFT: "Back to Draft",
  BOOKED: "Mark Booked",
  CONFIRMED: "Mark Confirmed",
  IN_FLIGHT: "Mark Departed",
  COMPLETED: "Mark Completed",
  CANCELLED: "Cancel Trip",
};

/**
 * The words for moving `from` → `to`. A step back along the lifecycle reads
 * "Back to Booked", not "Mark Booked" — the same button text for undoing a
 * confirmation and for making progress hid which one it was.
 */
export function moveVerb(to, from) {
  if (from && isStepBack(from, to)) return `Back to ${formatTripStatus(to)}`;
  return MOVE_VERBS[to] ?? formatTripStatus(to);
}

/** Whether `from` → `to` goes backwards along the forward path. */
export function isStepBack(from, to) {
  const a = TRIP_PROGRESS.indexOf(from);
  const b = TRIP_PROGRESS.indexOf(to);
  return a >= 0 && b >= 0 && b < a;
}

/** The forward path shown by the progress card, in order. */
export const TRIP_PROGRESS = ["DRAFT", "BOOKED", "CONFIRMED", "IN_FLIGHT", "COMPLETED"];

/** "TJ-1048", the way the desk says it. */
export function formatTripReference(reference) {
  return reference === null || reference === undefined ? DASH : `TJ-${reference}`;
}

const code = (airport) => airport?.icao ?? airport?.iata ?? DASH;

/** "Nov 10, 2026 · 09:30", or just the day when no time is set. */
export function formatLegDeparture(leg) {
  if (!leg?.departureDate) return leg?.departureTime ? `Time ${leg.departureTime}, day not set` : DASH;
  // A stored day, read in UTC so it is the day that was typed.
  const day = formatCalendarDate(leg.departureDate);
  return leg?.departureTime ? `${day} · ${leg.departureTime}` : day;
}

/**
 * The route as the board reads it. A round trip is "A → B" (the return is its
 * own column); a multi-leg trip names its first origin and final destination
 * and how many stops lie between.
 */
export function formatTripRoute(trip) {
  const legs = trip?.legs ?? [];
  if (legs.length === 0) return DASH;
  const first = legs[0];
  if (trip?.type === "ROUND_TRIP" || legs.length === 1) {
    return `${code(first?.originAirport)} → ${code(first?.destinationAirport)}`;
  }
  const last = legs[legs.length - 1];
  return `${code(first?.originAirport)} → ${code(last?.destinationAirport)} · ${legs.length} legs`;
}

/** The day the trip comes back or ends: a round trip's return, a multi-leg's final leg. */
function returnLeg(trip) {
  const legs = trip?.legs ?? [];
  if (legs.length < 2) return null;
  return legs[legs.length - 1];
}

/** "N780EX · Gulfstream G550", the free-text description, or a dash. */
export function formatTripAircraft(trip) {
  const aircraft = trip?.aircraft;
  if (aircraft) {
    return [aircraft?.tailNumber, aircraft?.model].filter(Boolean).join(" · ") || DASH;
  }
  return trip?.aircraftDescription || DASH;
}

/** Undefined (no permission) and null (not known) both read as a dash. */
function money(value) {
  return value === null || value === undefined ? DASH : formatMoney(value);
}

function margin(value) {
  if (value === null || value === undefined) return DASH;
  const number = Number(value);
  return Number.isFinite(number) ? `${number}%` : DASH;
}

/** A row on the trips board, or a card on a related record's Trips tab. */
export function toTripRow(trip) {
  const back = returnLeg(trip);
  return {
    id: trip?.id,
    reference: formatTripReference(trip?.reference),
    client: trip?.client ? displayName(trip.client) : DASH,
    clientId: trip?.clientId ?? null,
    broker: trip?.assignedBroker ? personName(trip.assignedBroker) : "Unassigned",
    route: formatTripRoute(trip),
    departure: formatLegDeparture(trip?.legs?.[0]),
    returnDate: back ? formatLegDeparture(back) : DASH,
    aircraft: formatTripAircraft(trip),
    operator: trip?.operator?.name ?? DASH,
    status: formatTripStatus(trip?.status),
    rawStatus: trip?.status ?? null,
    type: formatTripType(trip?.type),
    total: money(trip?.totalPrice),
    fet: money(trip?.fetAmount),
    profit: money(trip?.grossProfit),
    // The client's billing across this trip's invoices (Receivables, #16) and
    // what its operators billed and were paid (Operator Payments, #17), both
    // computed by the API — a dash for a role that may not read them.
    clientPayment: toTripPayment(trip?.clientPayment).state,
    clientBilling: toTripPayment(trip?.clientPayment),
    operatorPayment: toTripOperatorPayment(trip?.operatorPayment).state,
    operatorBilling: toTripOperatorPayment(trip?.operatorPayment),
    nextStatuses: trip?.nextStatuses ?? [],
    editable: Boolean(trip?.editable),
    ...toArchiveFields(trip),
  };
}

/**
 * Everything the trip detail page reads, already worded. The raw record rides
 * along as `raw` for the edit form, which needs ids rather than labels.
 */
export function toTripDetail(trip) {
  const row = toTripRow(trip);
  const legs = (trip?.legs ?? []).map((leg) => ({
    id: leg?.id,
    sequence: leg?.sequence,
    fromCode: code(leg?.originAirport),
    fromName: leg?.originAirport?.name ?? DASH,
    fromCity: leg?.originAirport?.city ?? "",
    toCode: code(leg?.destinationAirport),
    toName: leg?.destinationAirport?.name ?? DASH,
    toCity: leg?.destinationAirport?.city ?? "",
    departure: formatLegDeparture(leg),
  }));

  return {
    ...row,
    raw: trip,
    clientEmail: trip?.client?.email ?? null,
    clientPhone: trip?.client?.phone ?? null,
    operatorId: trip?.operatorId ?? null,
    aircraftId: trip?.aircraftId ?? null,
    registration: trip?.aircraft?.tailNumber ?? null,
    aircraftCategory: trip?.aircraft?.category ? formatAircraftCategory(trip.aircraft.category) : null,
    passengerCount: trip?.passengerCount ?? null,
    passengers: trip?.passengers ?? [],
    legs,
    operatorConfirmed: Boolean(trip?.operatorConfirmed),
    quote: trip?.quote ? { id: trip.quote.id, reference: `Q-${trip.quote.reference}` } : null,
    tripRequest: trip?.tripRequest
      ? { id: trip.tripRequest.id, reference: `TR-${trip.tripRequest.reference}` }
      : null,
    financial: {
      basePrice: money(trip?.basePrice),
      fet: money(trip?.fetAmount),
      extras: money(trip?.extrasTotal),
      total: money(trip?.totalPrice),
      operatorCost: money(trip?.operatorCost),
      grossProfit: money(trip?.grossProfit),
      margin: margin(trip?.marginPercentage),
      hasFinancials: trip?.grossProfit !== undefined,
    },
    internalNotes: trip?.internalNotes ?? null,
    clientNotes: trip?.clientNotes ?? null,
    documentUrls: trip?.documentUrls ?? [],
    isArchived: Boolean(trip?.deletedAt),
  };
}
