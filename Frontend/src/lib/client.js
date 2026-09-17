import { toArchiveFields, formatDate } from "@/lib/archive";

/**
 * Display helpers for clients and travel agents.
 *
 * The API speaks enum constants (`TRAVEL_AGENT`, `VIP`); the UI shows words.
 * Kept here rather than in a component so the table, the cards and the detail
 * page label them identically.
 */

const STATUS_LABELS = {
  LEAD: "Lead",
  ACTIVE: "Active",
  VIP: "VIP",
  INACTIVE: "Inactive",
};

const TYPE_LABELS = {
  DIRECT: "Direct",
  TRAVEL_AGENT: "Travel Agent",
};

const STAGE_LABELS = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  BOOKED: "Booked",
  LOST: "Lost",
};

const SOURCE_LABELS = {
  DIRECT: "Direct",
  TRAVEL_AGENT: "Travel Agent",
  FACEBOOK_GROUP_1: "Facebook Group 1",
  FACEBOOK_GROUP_2: "Facebook Group 2",
  REFERRAL: "Referral",
  WEBSITE: "Website",
  OTHER: "Other",
};

/** Every value, for the table filters and the form pickers. */
export const FILTERABLE_CLIENT_STATUSES = ["LEAD", "ACTIVE", "VIP", "INACTIVE"];
export const FILTERABLE_CLIENT_TYPES = ["DIRECT", "TRAVEL_AGENT"];
export const CLIENT_LEAD_STAGES = Object.keys(STAGE_LABELS);
export const CLIENT_LEAD_SOURCES = Object.keys(SOURCE_LABELS);

/** The follow-up windows the API accepts, with the labels the toolbar shows. */
export const FOLLOW_UP_WINDOWS = ["OVERDUE", "TODAY", "UPCOMING"];
const FOLLOW_UP_LABELS = {
  OVERDUE: "Overdue",
  TODAY: "Due Today",
  UPCOMING: "Upcoming",
};

export const formatClientStatus = (v) => STATUS_LABELS[v] ?? v ?? "";
export const formatClientType = (v) => TYPE_LABELS[v] ?? v ?? "";
export const formatLeadStage = (v) => STAGE_LABELS[v] ?? v ?? "";
export const formatLeadSource = (v) => SOURCE_LABELS[v] ?? v ?? "";
export const formatFollowUpWindow = (v) => FOLLOW_UP_LABELS[v] ?? v ?? "";

/** A person's display name, falling back to the company for an agency row. */
export function displayName(client) {
  const full = [client?.firstName, client?.lastName].filter(Boolean).join(" ");
  return full || client?.companyName || "—";
}

/**
 * Which of the three follow-up windows a date falls in, or null when none is
 * scheduled. Computed here so the badge and the filter agree on where the day
 * boundary sits.
 */
function followUpWindow(value) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (due < startOfToday) return "OVERDUE";
  if (due < startOfTomorrow) return "TODAY";
  return "UPCOMING";
}

/**
 * Maps one API client onto the props the table, cards and detail page render.
 *
 * Trip and spend figures are deliberately absent: they are aggregates over
 * trips, quotes and invoices, none of which exist yet. When those modules land
 * the API supplies them; until then the screens show an em dash rather than a
 * number nobody computed.
 */
export function toClientRow(client) {
  const window = followUpWindow(client?.nextFollowUpAt);

  return {
    id: client?.id,
    name: displayName(client),
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    company: client?.companyName ?? "—",
    companyName: client?.companyName ?? null,

    type: formatClientType(client?.type),
    rawType: client?.type ?? null,
    status: formatClientStatus(client?.status),
    rawStatus: client?.status ?? null,

    email: client?.email ?? "—",
    phone: client?.phone ?? "—",
    birthday: client?.birthday ?? null,
    birthdayLabel: formatDate(client?.birthday),

    // The related airport row, not a code typed into a box.
    homeAirport: client?.homeAirport?.icao ?? "—",
    homeAirportId: client?.homeAirport?.id ?? null,
    homeAirportName: client?.homeAirport?.name ?? null,

    leadStage: formatLeadStage(client?.leadStage),
    rawLeadStage: client?.leadStage ?? null,
    leadSource: formatLeadSource(client?.leadSource),
    rawLeadSource: client?.leadSource ?? null,

    broker: client?.assignedBroker
      ? [client.assignedBroker.firstName, client.assignedBroker.lastName]
          .filter(Boolean)
          .join(" ")
      : "Unassigned",
    assignedBrokerId: client?.assignedBroker?.id ?? null,

    nextFollowUpAt: client?.nextFollowUpAt ?? null,
    nextFollowUpLabel: formatDate(client?.nextFollowUpAt),
    followUpWindow: window,
    followUpWindowLabel: window ? formatFollowUpWindow(window) : "—",
    followUpNote: client?.followUpNote ?? "",

    preferences: client?.preferences ?? {},
    notes: client?.notes ?? "",
    labels: client?.labels ?? [],

    createdAt: client?.createdAt ?? null,
    addedLabel: formatDate(client?.createdAt),
    updatedAt: client?.updatedAt ?? null,

    ...toArchiveFields(client),
  };
}
