import { formatDate, toArchiveFields } from "@/lib/archive";

/**
 * Display helpers for the Leads & Agents screens.
 *
 * Neither "lead" nor "agent" is a table of its own, and that is the thing to
 * understand before changing anything here:
 *
 * - A **lead** is a `Client` at lead stage. The scope puts lead source and
 *   lead stage on the client (§6.3), so a separate leads table would have
 *   duplicated the client directory — two records for one person, drifting
 *   apart from the first edit.
 * - What that person **asked for** is a `TripRequest` (§6.4), a separate row,
 *   because one client can ask for three different trips and because the
 *   request outlives the lead stage: it becomes a quote, then a trip, while
 *   the client stays a client.
 * - An **agent** on the Agents tab is one of the desk's own brokers — a
 *   `User`, with lead numbers attached. Travel agents are something else
 *   entirely: clients of type `TRAVEL_AGENT`, in the client directory.
 */

const DASH = "—";

const STAGE_LABELS = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
};

const PRIORITY_LABELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

const SOURCE_LABELS = {
  DIRECT: "Direct",
  TRAVEL_AGENT: "Travel Agent",
  FACEBOOK_GROUP_1: "Facebook Group 1",
  FACEBOOK_GROUP_2: "Facebook Group 2",
  REFERRAL: "Referral",
  WEBSITE: "Website",
  OTHER: "Other",
};

const METHOD_LABELS = {
  CALL: "Call",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

const REQUEST_STATUS_LABELS = {
  OPEN: "Open",
  SOURCING: "Sourcing",
  QUOTED: "Quoted",
  CONVERTED: "Converted",
  LOST: "Lost",
};

/**
 * The funnel, in order.
 *
 * Order matters — it is the sales pipeline, and sorting it alphabetically
 * would put Contacted before New. The API enum is declared in this order too.
 */
export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "QUOTED",
  "WON",
  "LOST",
];

/** Stages where the desk is still working the lead. */
export const OPEN_LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "QUOTED",
];

export const LEAD_PRIORITIES = ["HIGH", "MEDIUM", "LOW"];
export const LEAD_SOURCES = Object.keys(SOURCE_LABELS);
export const FOLLOW_UP_METHODS = Object.keys(METHOD_LABELS);
export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS_LABELS);

export const formatLeadStage = (v) => (v ? (STAGE_LABELS[v] ?? v) : "");
export const formatPriority = (v) => (v ? (PRIORITY_LABELS[v] ?? v) : "");
export const formatLeadSource = (v) => (v ? (SOURCE_LABELS[v] ?? v) : "");
export const formatFollowUpMethod = (v) => (v ? (METHOD_LABELS[v] ?? v) : "");
export const formatRequestStatus = (v) =>
  v ? (REQUEST_STATUS_LABELS[v] ?? v) : "";

/** A person's display name, falling back to the company for an agency. */
export function personName(record) {
  const name = [record?.firstName, record?.lastName].filter(Boolean).join(" ");
  return name || record?.companyName || DASH;
}

/** Whole currency, no decimals — the desk quotes in round numbers. */
export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return DASH;
  const number = Number(value);
  if (!Number.isFinite(number)) return DASH;
  return number.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** "KTEB → KMIA", or an em dash when the route is not known yet. */
export function formatRoute(request) {
  const from = request?.originAirport?.icao;
  const to = request?.destinationAirport?.icao;
  if (!from && !to) return DASH;
  return `${from ?? "?"} → ${to ?? "?"}`;
}

/**
 * Maps one API trip request onto what the screens render.
 *
 * Nothing here invents a value. A request filed from a phone call may have
 * nothing but a client attached, and every empty field renders as an em dash
 * rather than a plausible-looking route or a zero estimate.
 */
export function toTripRequestRow(request) {
  return {
    id: request?.id,
    reference: request?.reference ? `TR-${request.reference}` : DASH,
    rawReference: request?.reference ?? null,

    clientId: request?.clientId ?? null,
    clientName: personName(request?.client),
    clientCompany: request?.client?.companyName ?? null,
    clientEmail: request?.client?.email ?? DASH,
    clientPhone: request?.client?.phone ?? DASH,
    clientType: request?.client?.type ?? null,

    brokerId: request?.assignedBrokerId ?? null,
    brokerName: request?.assignedBroker
      ? personName(request.assignedBroker)
      : "Unassigned",

    source: formatLeadSource(request?.source),
    rawSource: request?.source ?? null,
    status: formatRequestStatus(request?.status),
    rawStatus: request?.status ?? null,

    route: formatRoute(request),
    originIcao: request?.originAirport?.icao ?? null,
    originAirportId: request?.originAirportId ?? null,
    destinationIcao: request?.destinationAirport?.icao ?? null,
    destinationAirportId: request?.destinationAirportId ?? null,

    departureDate: formatDate(request?.departureDate),
    rawDepartureDate: request?.departureDate ?? null,
    returnDate: formatDate(request?.returnDate),
    rawReturnDate: request?.returnDate ?? null,
    // Derived, never stored: two fields that can disagree, will.
    isRoundTrip: Boolean(request?.returnDate),

    passengers: request?.passengers ?? DASH,
    rawPassengers: request?.passengers ?? null,
    aircraftPreference: request?.aircraftPreference ?? null,

    estimatedValue: formatMoney(request?.estimatedValue),
    rawEstimatedValue: request?.estimatedValue ?? null,

    summary: request?.summary ?? "",
    requirements: request?.requirements ?? "",
    internalNotes: request?.internalNotes ?? "",

    createdAt: request?.createdAt ?? null,
    updatedAt: request?.updatedAt ?? null,
    ...toArchiveFields(request),
  };
}

/**
 * Maps one API client onto a row for the Leads table.
 *
 * `latestRequest` is optional and supplied by the caller — the client list
 * does not carry enquiries, so a screen that needs the route fetches requests
 * alongside and pairs them up. Absent, the route and value columns read as an
 * em dash rather than as zero.
 */
export function toLeadRow(client, latestRequest = null) {
  return {
    id: client?.id,
    name: personName(client),
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    company: client?.companyName ?? DASH,
    email: client?.email ?? DASH,
    phone: client?.phone ?? DASH,
    type: client?.type ?? null,

    stage: formatLeadStage(client?.leadStage),
    rawStage: client?.leadStage ?? null,
    source: formatLeadSource(client?.leadSource),
    rawSource: client?.leadSource ?? null,
    priority: formatPriority(client?.priority),
    rawPriority: client?.priority ?? null,

    brokerId: client?.assignedBrokerId ?? null,
    brokerName: client?.assignedBroker
      ? personName(client.assignedBroker)
      : "Unassigned",

    nextFollowUp: formatDate(client?.nextFollowUpAt),
    rawNextFollowUpAt: client?.nextFollowUpAt ?? null,
    followUpMethod: formatFollowUpMethod(client?.followUpMethod),
    rawFollowUpMethod: client?.followUpMethod ?? null,
    followUpNote: client?.followUpNote ?? "",

    // Straight from the enquiry when one was paired in; never fabricated.
    route: latestRequest ? formatRoute(latestRequest) : DASH,
    estimatedValue: latestRequest
      ? formatMoney(latestRequest.estimatedValue)
      : DASH,
    latestRequestId: latestRequest?.id ?? null,

    createdAt: client?.createdAt ?? null,
    ...toArchiveFields(client),
  };
}

/**
 * Maps one broker-performance row onto the Agents table.
 *
 * `conversionRate`, `capacityUsed` and `activeTrips` arrive null when there is
 * nothing to measure — a broker with no leads yet, no capacity set, or the
 * Trips module not built. They render as an em dash, never as 0%, because a
 * new broker showing "0% conversion" is a wrong answer that follows them
 * around.
 */
export function toAgentRow(agent) {
  const percent = (value) =>
    value === null || value === undefined ? DASH : `${value}%`;

  return {
    id: agent?.id,
    name: personName(agent),
    email: agent?.email ?? DASH,
    phone: agent?.phone ?? DASH,
    role: agent?.role ?? null,
    status: agent?.status ?? null,

    activeLeads: agent?.activeLeads ?? 0,
    convertedLeads: agent?.convertedLeads ?? 0,
    followUpsDue: agent?.followUpsDue ?? 0,
    conversionRate: percent(agent?.conversionRate),
    capacityUsed: percent(agent?.capacityUsed),
    maxActiveLeads: agent?.maxActiveLeads ?? DASH,
    defaultFollowUpMethod: formatFollowUpMethod(agent?.defaultFollowUpMethod),

    // Awaiting the trips module.
    activeTrips: agent?.activeTrips ?? DASH,
  };
}
