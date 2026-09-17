import { formatDate, toArchiveFields } from "@/lib/archive";
import { formatMoney, formatRoute, personName } from "@/lib/lead";
import { formatAircraftCategory } from "@/lib/aircraft";

/**
 * Display helpers for Operator Sourcing.
 *
 * The thing to understand before changing anything here: **a sourcing request
 * is a trip request.** The board's rows — client, broker, route, departure,
 * budget — are all TripRequest columns, and the New Sourcing Request form is
 * the trip-request form with a quote deadline added. There is no "sourcing
 * request" table, and adding one would have split a single enquiry across two
 * rows the way a leads table would have split one client.
 *
 * What *is* new is the operator's answer: one `OperatorQuote` per operator
 * asked. So this file maps two things — the enquiry as the board renders it,
 * and the quotes underneath it.
 */

const DASH = "—";

/** Every quote state, for the comparison view's filter. */
export const OPERATOR_QUOTE_STATUSES = [
  "AWAITING_RESPONSE",
  "RECEIVED",
  "APPROVED",
  "REJECTED",
  "DECLINED",
];

const QUOTE_STATUS_LABELS = {
  AWAITING_RESPONSE: "Awaiting Response",
  RECEIVED: "Received",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DECLINED: "Declined",
};

export function formatQuoteStatus(status) {
  if (!status) return DASH;
  return QUOTE_STATUS_LABELS[status] ?? status;
}

/**
 * The four stages the board groups by, derived by the API from the quotes
 * rather than stored on the enquiry — a stored stage is wrong the moment the
 * next operator replies.
 */
export const SOURCING_STAGES = [
  "REQUESTED",
  "PENDING_OPERATOR_QUOTE",
  "SOURCING",
  "SOURCE_COMPLETE",
];

const STAGE_LABELS = {
  REQUESTED: "Requested",
  PENDING_OPERATOR_QUOTE: "Pending Operator Quote",
  SOURCING: "Sourcing",
  SOURCE_COMPLETE: "Source Complete",
};

export function formatSourcingStage(stage) {
  if (!stage) return DASH;
  return STAGE_LABELS[stage] ?? stage;
}

/**
 * Hours, as the desk says them: "2h", "36h", "3.5h".
 *
 * Null is an em dash and never "0h" — an operator who has not replied has no
 * response time, and 0 would make them look like the fastest on the desk.
 */
export function formatResponseTime(hours) {
  if (hours === null || hours === undefined) return DASH;
  const number = Number(hours);
  if (!Number.isFinite(number)) return DASH;
  if (number < 1) return `${Math.round(number * 60)}m`;
  return `${Number.isInteger(number) ? number : number.toFixed(1)}h`;
}

/** A percentage the API computed, or an em dash when it had nothing to measure. */
export function formatPercent(value) {
  if (value === null || value === undefined) return DASH;
  const number = Number(value);
  return Number.isFinite(number) ? `${number}%` : DASH;
}

/**
 * What the operator actually offered.
 *
 * Prefers the real tail when the quote points at one we hold, because that row
 * carries the seats and range the broker is comparing. Falls back to what the
 * operator wrote when it does not — operators fly airframes we have never
 * entered, and that is recorded rather than refused.
 */
export function quotedAircraftLabel(quote) {
  if (quote?.aircraft) {
    const { model, tailNumber } = quote.aircraft;
    return [model, tailNumber].filter(Boolean).join(" · ") || DASH;
  }
  const written = [quote?.quotedAircraft, quote?.quotedTailNumber]
    .filter(Boolean)
    .join(" · ");
  return written || DASH;
}

/**
 * Maps one API operator quote onto what the comparison cards render.
 *
 * Nothing here invents a value. `responseHours` and `isOverdue` arrive already
 * derived from the API — they are never stored, because a stored "2h" is right
 * for one day and wrong forever after, and the operator scorecard is built on
 * response speed.
 */
export function toQuoteRow(quote) {
  return {
    id: quote?.id,

    tripRequestId: quote?.tripRequestId ?? null,
    requestReference: quote?.tripRequest?.reference
      ? `TR-${quote.tripRequest.reference}`
      : DASH,

    operatorId: quote?.operatorId ?? null,
    operator: quote?.operator?.name ?? DASH,
    operatorStatus: quote?.operator?.status ?? null,
    operatorReliability: quote?.operator?.reliabilityRating ?? null,
    operatorEmail:
      quote?.operator?.contactEmail ?? quote?.operator?.generalEmail ?? null,

    aircraftId: quote?.aircraftId ?? null,
    aircraft: quotedAircraftLabel(quote),
    suggestedAircraft: quote?.suggestedAircraft || DASH,

    price: formatMoney(quote?.price),
    rawPrice: quote?.price ?? null,

    amenities: quote?.amenities ?? [],
    terms: quote?.terms || DASH,

    status: formatQuoteStatus(quote?.status),
    rawStatus: quote?.status ?? null,
    /** The board disables Approve and Reject once a quote is settled. */
    isDecided: ["APPROVED", "REJECTED", "DECLINED"].includes(quote?.status),

    requestedAt: quote?.requestedAt ?? null,
    requestedLabel: formatDate(quote?.requestedAt),
    respondedAt: quote?.respondedAt ?? null,
    respondedLabel: formatDate(quote?.respondedAt),
    responseTime: formatResponseTime(quote?.responseHours),
    rawResponseHours: quote?.responseHours ?? null,

    /** Past the enquiry's quote deadline with no answer in. Null with no deadline. */
    isOverdue: quote?.isOverdue ?? null,

    decisionNote: quote?.decisionNote || "",
    internalNotes: quote?.internalNotes || "",

    // Audit trail, present on every record in every module.
    createdAt: quote?.createdAt ?? null,
    updatedAt: quote?.updatedAt ?? null,

    // Archive trail: who removed it, who brought it back, and whether the live
    // row should carry the "Restored" badge.
    ...toArchiveFields(quote),
  };
}

/**
 * Maps one API trip request onto the sourcing board's row.
 *
 * The counts come from `request.sourcing`, which the API derives from the
 * quotes on every read. Before Operator Sourcing shipped that key did not
 * exist; it is absent rather than zero for an enquiry nobody has sourced, and
 * the screen shows an em dash instead of "0 contacted".
 */
export function toSourcingRow(request) {
  const sourcing = request?.sourcing ?? null;

  return {
    id: request?.id,
    reference: request?.reference ? `TR-${request.reference}` : DASH,

    client: personName(request?.client),
    clientId: request?.clientId ?? null,
    clientCompany: request?.client?.companyName ?? null,

    broker: request?.assignedBroker
      ? personName(request.assignedBroker)
      : "Unassigned",
    brokerId: request?.assignedBrokerId ?? null,

    route: formatRoute(request),
    from: request?.originAirport?.icao ?? DASH,
    to: request?.destinationAirport?.icao ?? DASH,

    departure: formatDate(request?.departureDate),
    rawDepartureDate: request?.departureDate ?? null,
    deadline: formatDate(request?.quoteDeadline),
    rawQuoteDeadline: request?.quoteDeadline ?? null,

    passengers: request?.passengers ?? DASH,
    // Formatted here, never raw: the board would otherwise print HEAVY_JET at
    // the reader. Enum casing is the wire vocabulary, not the display one.
    aircraftNeeded: request?.aircraftPreference
      ? formatAircraftCategory(request.aircraftPreference)
      : DASH,
    rawAircraftPreference: request?.aircraftPreference ?? null,
    budget: formatMoney(request?.estimatedValue),
    rawBudget: request?.estimatedValue ?? null,

    requestStatus: request?.status ?? null,
    notes: request?.requirements || request?.summary || "",

    // Counted from the quotes, never stored. Em dashes rather than zeros when
    // sourcing has not started — "0 contacted" and "no data" look identical on
    // a board, and only one of them is true.
    stage: sourcing ? formatSourcingStage(sourcing.stage) : DASH,
    rawStage: sourcing?.stage ?? null,
    operatorsContacted: sourcing?.operatorsContacted ?? DASH,
    responses: sourcing?.responses ?? DASH,
    bestPrice: sourcing?.bestPrice ? formatMoney(sourcing.bestPrice) : DASH,
    rawBestPrice: sourcing?.bestPrice ?? null,
    approvedQuoteId: sourcing?.approvedQuoteId ?? null,

    createdAt: request?.createdAt ?? null,
    updatedAt: request?.updatedAt ?? null,
    ...toArchiveFields(request),

    /**
     * Deposit state is a Trips/Receivables fact, and the sourcing screen's
     * payment filter was built against dummy data that had it. Nothing can
     * supply it until Receivables (#16) lands, so it is null and the column
     * renders an em dash rather than a confident "Pending".
     */
    depositStatus: null,
  };
}
