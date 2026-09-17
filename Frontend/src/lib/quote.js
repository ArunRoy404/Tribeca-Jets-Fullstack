import { formatDate, formatTimestamp, toArchiveFields } from "@/lib/archive";
import { formatMoney, formatRoute, personName } from "@/lib/lead";

/**
 * Display helpers for client quotes.
 *
 * Two things to understand before changing anything here.
 *
 * **A client quote is not an operator quote.** An `OperatorQuote` (module #9)
 * is what an operator charges us; this is what the client pays, with margin and
 * Federal Excise Tax on top. `sourcedFrom` below is the link between them.
 *
 * **Every money figure except the inputs is computed by the API on read.**
 * `fetAmount`, `extrasTotal`, `totalPrice`, `grossProfit` and `marginPercentage`
 * arrive already worked out and are never stored — so nothing in this file
 * recalculates them, and no component may either. A second copy of the
 * arithmetic in JavaScript would disagree with the server the first time a
 * rounding rule changed, and the number on screen is the number a broker reads
 * down the phone.
 */

const DASH = "—";

/** Every quote state, for the board's filter. */
export const QUOTE_STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
];

const STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export function formatQuoteStatus(status) {
  if (!status) return DASH;
  return STATUS_LABELS[status] ?? status;
}

/** A quote the client has not answered yet. */
export const OPEN_QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED"];

/** "V3", the way the desk says it. */
export function formatVersion(version) {
  return version ? `V${version}` : DASH;
}

/**
 * A percentage the API computed, or an em dash when it had nothing to measure.
 *
 * Null here means one of two things and both must read as blank: the operator's
 * cost is not in yet, or the caller may not see margins at all. Rendering
 * either as "0%" would be a number nobody produced.
 */
export function formatMargin(value) {
  if (value === null || value === undefined) return DASH;
  const number = Number(value);
  return Number.isFinite(number) ? `${number}%` : DASH;
}

/** The FET rate as the form says it: 0.075 → "7.5%". */
export function formatFetRate(rate) {
  if (rate === null || rate === undefined) return DASH;
  const number = Number(rate);
  if (!Number.isFinite(number)) return DASH;
  return `${Math.round(number * 1000) / 10}%`;
}

/**
 * One extra on the offer, as the breakdown prints it.
 *
 * An "Included" line is words, not money — it has no amount, and showing "$0"
 * against the catering a client is getting free would be wrong in the
 * direction that matters.
 */
export function toLineItemRow(item) {
  const priced = item?.amount !== null && item?.amount !== undefined;
  return {
    label: item?.label ?? DASH,
    amount: priced ? formatMoney(item.amount) : "Included",
    type: priced ? "currency" : "text",
    rawAmount: priced ? item.amount : null,
  };
}

/** What the offer actually puts the client on. */
export function quotedAircraftLabel(quote) {
  if (quote?.aircraft) {
    const { model, tailNumber } = quote.aircraft;
    return [model, tailNumber].filter(Boolean).join(" · ") || DASH;
  }
  return quote?.quotedAircraft || DASH;
}

/**
 * Maps one API quote onto the board row and the detail page.
 *
 * Nothing here invents a value. Where the API sent null — because there is no
 * operator cost yet, or because the caller may not see margins — the row
 * carries an em dash, and the components read it straight.
 */
export function toQuoteRow(quote) {
  const hasFinancials = quote?.grossProfit !== undefined;

  return {
    id: quote?.id,
    reference: quote?.reference ? `Q-${quote.reference}` : DASH,

    client: personName(quote?.client),
    clientId: quote?.clientId ?? null,
    company: quote?.client?.companyName || DASH,
    clientPriority: quote?.client?.priority ?? null,
    clientStatus: quote?.client?.status ?? null,
    /** The VIP chip on the card. `ClientStatus.VIP`, not a tier we invented. */
    isVip: quote?.client?.status === "VIP",

    broker: quote?.assignedBroker ? personName(quote.assignedBroker) : "Unassigned",
    brokerId: quote?.assignedBrokerId ?? null,

    route: formatRoute(quote),
    origin: quote?.originAirport?.icao ?? DASH,
    destination: quote?.destinationAirport?.icao ?? DASH,
    // Ids as well as codes: the edit form prefills from this row, and a form
    // that reopens with the airport cleared posts the blank back.
    originAirportId: quote?.originAirportId ?? null,
    destinationAirportId: quote?.destinationAirportId ?? null,

    departure: formatDate(quote?.departureDate),
    rawDepartureDate: quote?.departureDate ?? null,
    returnDate: formatDate(quote?.returnDate),
    rawReturnDate: quote?.returnDate ?? null,
    passengers: quote?.passengers ?? DASH,

    operator: quote?.operator?.name ?? DASH,
    operatorId: quote?.operatorId ?? null,
    aircraft: quotedAircraftLabel(quote),
    aircraftId: quote?.aircraftId ?? null,
    rawQuotedAircraft: quote?.quotedAircraft ?? "",

    // ---- Money. Every figure below the first four came from the API. -------
    basePrice: formatMoney(quote?.basePrice),
    rawBasePrice: quote?.basePrice ?? null,
    fetEnabled: quote?.fetEnabled ?? true,
    fetRate: quote?.fetRate ?? null,
    fetRateLabel: formatFetRate(quote?.fetRate),
    fet: quote?.fetEnabled ? formatMoney(quote?.fetAmount) : "Not charged",
    rawFetAmount: quote?.fetAmount ?? null,

    lineItems: (quote?.lineItems ?? []).map(toLineItemRow),
    extras: formatMoney(quote?.extrasTotal),
    rawExtrasTotal: quote?.extrasTotal ?? null,

    total: formatMoney(quote?.totalPrice),
    rawTotal: quote?.totalPrice ?? null,

    deposit: quote?.depositAmount === null ? DASH : formatMoney(quote?.depositAmount),
    rawDeposit: quote?.depositAmount ?? null,

    /**
     * Absent for a caller without VIEW_FINANCIALS — the API omits the keys
     * rather than zeroing them, and `hasFinancials` is how the profitability
     * card knows to say so instead of printing three em dashes that look like
     * missing data.
     */
    hasFinancials,
    operatorCost: hasFinancials ? formatMoney(quote?.operatorCost) : DASH,
    rawOperatorCost: quote?.operatorCost ?? null,
    grossProfit: hasFinancials ? formatMoney(quote?.grossProfit) : DASH,
    rawGrossProfit: quote?.grossProfit ?? null,
    margin: hasFinancials ? formatMargin(quote?.marginPercentage) : DASH,
    rawMargin: quote?.marginPercentage ?? null,

    // ---- State -------------------------------------------------------------
    status: formatQuoteStatus(quote?.status),
    rawStatus: quote?.status ?? null,
    isOpen: OPEN_QUOTE_STATUSES.includes(quote?.status),
    isDecided: ["APPROVED", "REJECTED"].includes(quote?.status),

    version: formatVersion(quote?.version),
    rawVersion: quote?.version ?? null,

    sent: formatDate(quote?.sentAt),
    rawSentAt: quote?.sentAt ?? null,
    /**
     * Only the client portal (#25) can set this, and it does not exist. Null
     * means "we cannot tell", which is what scope §16 says — "client opened
     * quote, where technically trackable" — not "they have not looked".
     */
    viewed: quote?.viewedAt ? formatTimestamp(quote.viewedAt) : DASH,
    decided: formatDate(quote?.decidedAt),

    expiry: formatDate(quote?.validUntil),
    rawValidUntil: quote?.validUntil ?? null,
    /** Derived by the API on every read, never a stored flag. */
    isExpired: quote?.isExpired ?? null,
    daysUntilExpiry: quote?.daysUntilExpiry ?? null,

    terms: quote?.terms || "",
    notes: quote?.internalNotes || "",
    decisionNote: quote?.decisionNote || "",

    tripRequestId: quote?.tripRequestId ?? null,
    requestReference: quote?.tripRequest?.reference
      ? `TR-${quote.tripRequest.reference}`
      : DASH,

    /** The operator price this offer was built on, when it came from sourcing. */
    sourcedFrom: quote?.operatorQuote
      ? {
          id: quote.operatorQuote.id,
          operator: quote.operatorQuote.operator?.name ?? DASH,
          price: formatMoney(quote.operatorQuote.price),
        }
      : null,

    createdAt: quote?.createdAt ?? null,
    updatedAt: quote?.updatedAt ?? null,
    ...toArchiveFields(quote),
  };
}

/**
 * One frozen version, for the history card.
 *
 * Every figure here was written at the time and is rendered exactly as stored.
 * The whole point of a snapshot is that it does not move.
 */
export function toVersionRow(version, currentVersion) {
  return {
    id: version?.id,
    version: formatVersion(version?.version),
    rawVersion: version?.version ?? null,
    amount: formatMoney(version?.totalPrice),
    base: formatMoney(version?.basePrice),
    fet: formatMoney(version?.fetAmount),
    extras: formatMoney(version?.extrasTotal),
    profit:
      version?.grossProfit === undefined
        ? DASH
        : formatMoney(version?.grossProfit),
    note: version?.note || DASH,
    date: formatDate(version?.createdAt),
    by: version?.createdBy ? personName(version.createdBy) : DASH,
    isCurrent: version?.version === currentVersion,
  };
}
