import { displayName } from "@/lib/client";
import { getFullName } from "@/lib/user";
import { formatTripReference } from "@/lib/trip";
import { formatTimestamp, toArchiveFields } from "@/lib/archive";

/**
 * Display helpers for Email Templates (#21) and the sent log.
 *
 * Merge fields are filled by the API, never here: the preview endpoint
 * returns the text already filled and names what it could not fill, so the
 * compose form and the email that goes out cannot disagree.
 */

const DASH = "—";

export const EMAIL_TEMPLATE_CATEGORIES = [
  "QUOTE_FOLLOW_UP",
  "TRIP_CONFIRMATION",
  "CLIENT_UPDATE",
  "EMPTY_LEG",
  "PAYMENT",
  "TRAVEL_AGENT",
  "GENERAL",
];
const CATEGORY_LABELS = {
  QUOTE_FOLLOW_UP: "Quote Follow-up",
  TRIP_CONFIRMATION: "Trip Confirmation",
  CLIENT_UPDATE: "Client Update",
  EMPTY_LEG: "Empty Leg",
  PAYMENT: "Payment",
  TRAVEL_AGENT: "Travel Agent",
  GENERAL: "General",
};
export const formatEmailCategory = (value) => (value ? (CATEGORY_LABELS[value] ?? value) : DASH);

/** Offered when composing, or switched off — the filter's wire values are the API's booleans. */
export const TEMPLATE_ACTIVITY = ["true", "false"];
export const formatTemplateActivity = (value) => (value === "true" ? "Active" : value === "false" ? "Inactive" : DASH);

export const EMAIL_STATUSES = ["SENT", "LOGGED", "FAILED"];
const STATUS_LABELS = { SENT: "Sent", LOGGED: "Not delivered", FAILED: "Failed" };
export const formatEmailStatus = (value) => (value ? (STATUS_LABELS[value] ?? value) : DASH);

/** What each status means, for the tooltip and the detail sheet. */
export const EMAIL_STATUS_HINTS = {
  SENT: "The mail server accepted it.",
  LOGGED: "No mail server is configured, so it was recorded and delivered to nobody.",
  FAILED: "The mail server refused it. Nothing was delivered.",
};

/** The tabs: the live library, the sent log, and the archived library. */
export const EMAIL_TABS = { LIVE: "live", SENT: "sent", ARCHIVED: "archived" };

/** One template, as the table, the cards, the sheet and the editor read it. */
export function toEmailTemplate(template) {
  return {
    id: template?.id,
    name: template?.name || DASH,
    category: template?.category ?? null,
    categoryLabel: formatEmailCategory(template?.category),
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    active: Boolean(template?.active),
    status: template?.active ? "Active" : "Inactive",
    lastUpdated: formatTimestamp(template?.updatedAt),
    updatedBy: template?.updatedBy ? getFullName(template.updatedBy) : DASH,
    ...toArchiveFields(template),
    raw: template,
  };
}

/** One sent email, as the log and its sheet read it. */
export function toSentEmail(email) {
  const about = [
    email?.trip ? formatTripReference(email.trip.reference) : null,
    email?.quote ? `Q-${email.quote.reference}` : null,
    email?.invoice?.number ?? null,
  ].filter(Boolean);
  return {
    id: email?.id,
    sentAt: formatTimestamp(email?.createdAt),
    to: email?.toName || DASH,
    toEmail: email?.toEmail || DASH,
    recipientKind: email?.clientId ? "Client" : email?.operatorId ? "Operator" : DASH,
    clientId: email?.clientId ?? null,
    client: email?.client ? displayName(email.client) : null,
    operator: email?.operator?.name ?? null,
    subject: email?.subject || DASH,
    body: email?.body ?? "",
    template: email?.template?.name ?? "Written from scratch",
    status: email?.status ?? null,
    statusLabel: formatEmailStatus(email?.status),
    statusHint: EMAIL_STATUS_HINTS[email?.status] ?? "",
    error: email?.error ?? null,
    about: about.length ? about.join(" · ") : DASH,
    sentBy: email?.createdBy ? getFullName(email.createdBy) : DASH,
  };
}

/**
 * What the compose form sends: exactly one recipient, and only the records
 * that were actually named. Empty ids are dropped, never sent as "".
 */
export function emailContext({ clientId, operatorId, tripId, quoteId, invoiceId, templateId } = {}) {
  const context = { clientId, operatorId, tripId, quoteId, invoiceId, templateId };
  return Object.fromEntries(Object.entries(context).filter(([, value]) => Boolean(value)));
}
