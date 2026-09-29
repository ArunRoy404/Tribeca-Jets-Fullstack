import { formatMoney, formatMoneyExact } from "@/lib/money";
import { displayName } from "@/lib/client";
import { actorName, formatDate } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatTripReference } from "@/lib/trip";
import { formatTaskReference } from "@/lib/task";
import { formatDocumentCategory } from "@/lib/document";

/**
 * The overview's wording (#24). Every figure comes from `/dashboard/*` or an
 * owning module's list; nothing here computes one. A section the API left
 * out — the caller may not read it — produces no tile rather than a zero.
 */

const DASH = "—";

/** The date filter, in the API's vocabulary. */
export const DASHBOARD_PERIODS = ["TODAY", "WEEK", "MONTH", "QUARTER", "YEAR"];
export const DEFAULT_DASHBOARD_PERIOD = "WEEK";

export const PERIOD_LABELS = {
  TODAY: "Today",
  WEEK: "This Week",
  MONTH: "This Month",
  QUARTER: "This Quarter",
  YEAR: "Year to Date",
};

/** What "the window before" is called, for the comparison badge. */
const PREVIOUS_LABELS = {
  TODAY: "yesterday",
  WEEK: "last week",
  MONTH: "last month",
  QUARTER: "last quarter",
  YEAR: "last year",
};

/** Short, for a tile title: "REVENUE (WEEK)". */
const PERIOD_SHORT = { TODAY: "TODAY", WEEK: "WEEK", MONTH: "MTD", QUARTER: "QTD", YEAR: "YTD" };

const ICON = (n) => `/dashboard/icons/stat${n}-icon.svg`;

/**
 * "+18% vs last week", toned by direction — or nothing when the API says
 * there is no comparison (nothing in the window before). Never "+∞%".
 */
function changeBadge(change, period) {
  if (change === null || change === undefined) return {};
  const previous = PREVIOUS_LABELS[period] ?? "before";
  return {
    badgeText: `${change > 0 ? "+" : ""}${change}% vs ${previous}`,
    tone: change >= 0 ? "success" : "destructive",
  };
}

const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/**
 * The tiles, in the order the design lays them out. Each tile exists only
 * when its section came back, so an assistant — who may not read money —
 * sees the counts and not a row of dashes.
 */
export function toSummaryTiles(summary, period) {
  if (!summary) return [];
  const short = PERIOD_SHORT[period] ?? period;
  const tiles = [];

  tiles.push({
    id: "upcoming-trips",
    icon: ICON(1),
    title: "UPCOMING TRIPS",
    value: String(summary?.trips?.upcoming ?? DASH),
    subtitle: "departing today or later",
    subtitleTone: "muted",
  });

  tiles.push({
    id: "open-requests",
    icon: ICON(2),
    title: "OPEN REQUESTS",
    value: String(summary?.requests?.active ?? DASH),
    subtitle: `${summary?.requests?.awaitingSourcing ?? 0} awaiting sourcing`,
    subtitleTone: summary?.requests?.awaitingSourcing ? "warning" : "muted",
  });

  const money = summary?.money;
  if (money) {
    const revenue = money?.revenue;
    tiles.push({
      id: "revenue",
      icon: ICON(3),
      title: `REVENUE (${short})`,
      value: formatMoney(revenue?.current),
      subtitle: `${plural(revenue?.pricedCount ?? 0, "priced trip")} departing`,
      subtitleTone: "muted",
      ...changeBadge(revenue?.change, period),
    });

    const profit = money?.profit;
    tiles.push({
      id: "gross-profit",
      icon: ICON(4),
      title: `GROSS PROFIT (${short})`,
      value: profit?.tripCount ? formatMoney(profit?.current) : DASH,
      subtitle:
        profit?.marginPercentage === null || profit?.marginPercentage === undefined
          ? "no operator costs entered"
          : `${profit.marginPercentage}% margin · ${plural(profit?.tripCount ?? 0, "trip")}`,
      subtitleTone: "muted",
      ...changeBadge(profit?.change, period),
    });
  }

  const receivables = summary?.receivables;
  if (receivables) {
    tiles.push({
      id: "receivables",
      icon: ICON(5),
      title: "CLIENT RECEIVABLES",
      value: formatMoney(receivables?.outstanding),
      subtitle: `${plural(receivables?.openCount ?? 0, "open invoice")}`,
      subtitleTone: "muted",
      ...(receivables?.overdueCount
        ? { badgeText: `${plural(receivables.overdueCount, "overdue payment")}`, tone: "warning" }
        : {}),
    });
  }

  const payables = summary?.operatorPayments;
  if (payables) {
    tiles.push({
      id: "operator-payments",
      icon: ICON(6),
      title: "OPERATOR PAYMENTS",
      value: formatMoney(payables?.outstanding),
      subtitle: `${plural(payables?.dueThisWeek ?? 0, "bill")} due this week`,
      subtitleTone: payables?.dueThisWeek ? "info" : "muted",
      ...(payables?.overdueCount
        ? { badgeText: `${plural(payables.overdueCount, "overdue bill")}`, tone: "destructive" }
        : {}),
    });
  }

  if (money) {
    tiles.push({
      id: "fet",
      icon: ICON(7),
      title: `FET CHARGED (${short})`,
      value: formatMoney(money?.fet?.current),
      subtitle: "on trips departing",
      subtitleTone: "muted",
      ...changeBadge(money?.fet?.change, period),
    });
  }

  const legs = summary?.emptyLegs;
  if (legs) {
    tiles.push({
      id: "empty-legs",
      icon: ICON(8),
      title: "EMPTY LEGS",
      value: `${legs?.available ?? 0} on offer`,
      subtitle: `${plural(legs?.matched ?? 0, "matched leg")}`,
      subtitleTone: "muted",
    });
  }

  return tiles;
}

// ---- Priorities -------------------------------------------------------------

const STATE_LABELS = { OVERDUE: "Overdue", DUE_TODAY: "Due Today", DUE_SOON: "Due Soon" };
const STATE_DOTS = { OVERDUE: "bg-destructive", DUE_TODAY: "bg-destructive", DUE_SOON: "bg-warning" };

const CATEGORY = {
  FOLLOW_UP: "Follow-up",
  CLIENT_PAYMENT: "Client Payment",
  OPERATOR_PAYMENT: "Operator Payment",
  TASK: "Task",
  DOCUMENT_EXPIRY: "Document",
};

/** Where a document's owner opens — the folder is on that page. */
const OWNER_HREFS = {
  CLIENT: (id) => `/dashboard/clients/${id}`,
  TRIP: (id) => `/dashboard/trips/${id}`,
  OPERATOR: (id) => `/dashboard/operators/${id}`,
};

/** A day-level due date: "Today", "Tomorrow", "3 days ago", or the date. */
function dueLabel(item) {
  const due = new Date(item?.dueAt);
  if (Number.isNaN(due.getTime())) return DASH;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Follow-ups carry a time; bills and tasks are calendar days at midnight UTC.
  const day =
    item?.kind === "FOLLOW_UP"
      ? new Date(due.getFullYear(), due.getMonth(), due.getDate())
      : new Date(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return days === -1 ? "Yesterday" : `${-days} days ago`;
  return item?.kind === "FOLLOW_UP" ? formatDate(due) : formatCalendarDate(item?.dueAt);
}

/**
 * One priority as a row: a sentence, where it stands, and where "View" goes.
 * The sentence is built from the record's own fields; a follow-up with no
 * note says so rather than inventing a reason.
 */
export function toPriorityItem(item) {
  const base = {
    id: item?.id,
    dot: STATE_DOTS[item?.state] ?? "bg-warning",
    status: STATE_LABELS[item?.state] ?? DASH,
    category: CATEGORY[item?.kind] ?? DASH,
    date: dueLabel(item),
  };

  switch (item?.kind) {
    case "FOLLOW_UP": {
      const name = displayName(item?.client);
      return {
        ...base,
        title: item?.note ? `Follow up with ${name} — ${item.note}` : `Follow up with ${name}`,
        meta: item?.broker ? actorName(item.broker) : "Unassigned",
        href: `/dashboard/clients/${item?.client?.id}`,
      };
    }
    case "CLIENT_PAYMENT":
      return {
        ...base,
        title: `${displayName(item?.client)} owes ${formatMoneyExact(item?.invoice?.balance)} on ${item?.invoice?.number ?? "an invoice"}`,
        meta: formatTripReference(item?.trip?.reference),
        href: `/dashboard/receivables?invoice=${item?.invoice?.id}`,
      };
    case "OPERATOR_PAYMENT":
      return {
        ...base,
        title: `Pay ${item?.operator?.name ?? "the operator"} ${formatMoneyExact(item?.payable?.balance)} on ${item?.payable?.number ?? "a bill"}`,
        meta: formatTripReference(item?.trip?.reference),
        href: `/dashboard/operator-payments?bill=${item?.payable?.id}`,
      };
    case "TASK":
      return {
        ...base,
        title: item?.task?.title ?? DASH,
        meta: [
          formatTaskReference(item?.task?.reference),
          item?.trip ? formatTripReference(item.trip.reference) : null,
          item?.client ? displayName(item.client) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/dashboard/tasks-board?task=${item?.task?.id}`,
      };
    case "DOCUMENT_EXPIRY": {
      // A passport's title can carry its number; a restricted document is
      // named by its category only, as on the timeline.
      const what = item?.document?.sensitive
        ? formatDocumentCategory(item?.document?.category)
        : (item?.document?.title ?? formatDocumentCategory(item?.document?.category));
      const toHref = OWNER_HREFS[item?.owner?.type];
      return {
        ...base,
        title: `${what} ${item?.state === "OVERDUE" ? "expired" : "expires"}`,
        meta: item?.owner?.label ?? "",
        href: toHref && item?.owner?.id ? toHref(item.owner.id) : null,
      };
    }
    default:
      return { ...base, title: DASH, meta: "", href: null };
  }
}

// ---- Activity ---------------------------------------------------------------

/**
 * What each recorded action says, past tense, before the record's label.
 * An action nobody has worded is humanised from its code — clumsy and true
 * — never guessed, the same rule the notes timeline follows.
 */
const ACTIVITY_PHRASES = {
  "client.created": "added client",
  "client.updated": "updated client",
  "client.deleted": "archived client",
  "client.removed_bulk": "archived client",
  "client.restored": "restored client",
  "client.restored_bulk": "restored client",
  "client_credit.created": "recorded a credit movement for",
  "client_credit.updated": "corrected a credit movement for",
  "client_credit.removed": "withdrew a credit movement for",
  "client_credit.restored": "restored a credit movement for",
  "note.created": "wrote a note",
  "note.updated": "edited a note",
  "note.removed": "withdrew a note",
  "note.restored": "restored a note",
  "trip_request.created": "logged trip request",
  "trip_request.updated": "updated trip request",
  "trip_request.converted": "converted trip request",
  "trip_request.removed": "archived trip request",
  "trip_request.removed_bulk": "archived trip request",
  "trip_request.restored": "restored trip request",
  "trip_request.restored_bulk": "restored trip request",
  "operatorQuote.requested": "asked for a quote from",
  "operatorQuote.responded": "recorded a quote from",
  "operatorQuote.approved": "approved the quote from",
  "operatorQuote.updated": "updated the quote from",
  "operatorQuote.reopened": "reopened the quote from",
  "operatorQuote.archived": "archived the quote from",
  "operatorQuote.archivedMany": "archived the quote from",
  "operatorQuote.restored": "restored the quote from",
  "operatorQuote.restoredMany": "restored the quote from",
  "quote.created": "created quote",
  "quote.revised": "revised quote",
  "quote.duplicated": "duplicated quote",
  "quote.sent": "marked sent quote",
  "quote.reopened": "reopened quote",
  "quote.archived": "archived quote",
  "quote.bulkArchived": "archived quote",
  "quote.restored": "restored quote",
  "quote.bulkRestored": "restored quote",
  "trip.created": "created trip",
  "trip.booked_from_quote": "booked trip",
  "trip.updated": "updated trip",
  "trip.status_changed": "moved trip",
  "trip.archived": "archived trip",
  "trip.bulk_archived": "archived trip",
  "trip.restored": "restored trip",
  "trip.bulk_restored": "restored trip",
  "flight.status_changed": "reported the flight on",
  "flight.updated": "updated the flight on",
  "itinerary.created": "built the itinerary for",
  "itinerary.updated": "updated the itinerary for",
  "itinerary.confirmed": "confirmed the itinerary for",
  "itinerary.sent": "marked sent the itinerary for",
  "itinerary.archived": "archived the itinerary for",
  "itinerary.bulk_archived": "archived the itinerary for",
  "itinerary.restored": "restored the itinerary for",
  "itinerary.bulk_restored": "restored the itinerary for",
  "invoice.created": "raised invoice",
  "invoice.updated": "updated invoice",
  "invoice.payment_recorded": "recorded a client payment on",
  "invoice.payment_updated": "corrected a client payment on",
  "invoice.payment_withdrawn": "withdrew a client payment on",
  "invoice.payment_restored": "restored a client payment on",
  "invoice.archived": "archived invoice",
  "invoice.bulk_archived": "archived invoice",
  "invoice.restored": "restored invoice",
  "invoice.bulk_restored": "restored invoice",
  "operator_payable.created": "recorded operator bill",
  "operator_payable.updated": "updated operator bill",
  "operator_payable.payment_recorded": "paid operator bill",
  "operator_payable.archived": "archived operator bill",
  "operator_payable.bulk_archived": "archived operator bill",
  "operator_payable.restored": "restored operator bill",
  "operator_payable.bulk_restored": "restored operator bill",
  "commission.created": "raised a commission on",
  "commission.raised_for_referral": "raised a referral commission on",
  "commission.archived": "archived a commission on",
  "commission.bulk_archived": "archived a commission on",
  "commission.restored": "restored a commission on",
  "commission.bulk_restored": "restored a commission on",
  "empty_leg.created": "listed empty leg",
  "empty_leg.archived": "archived empty leg",
  "empty_leg.bulk_archived": "archived empty leg",
  "empty_leg.restored": "restored empty leg",
  "empty_leg.bulk_restored": "restored empty leg",
  "task.created": "created task",
  "task.updated": "updated task",
  "task.status_changed": "moved task",
  "task.archived": "archived task",
  "task.restored": "restored task",
  "email_template.created": "created email template",
  "email_template.updated": "updated email template",
  "email_template.archived": "archived email template",
  "email_template.bulk_archived": "archived email template",
  "email_template.restored": "restored email template",
  "email_template.bulk_restored": "restored email template",
  "email.sent": "emailed",
  "email.failed": "tried to email",
  "operator.created": "added operator",
  "operator.updated": "updated operator",
  "operator.removed": "archived operator",
  "operator.removed_bulk": "archived operator",
  "operator.restored": "restored operator",
  "operator.restored_bulk": "restored operator",
  "aircraft.created": "added aircraft",
  "aircraft.updated": "updated aircraft",
  "aircraft.removed": "archived aircraft",
  "aircraft.removed_bulk": "archived aircraft",
  "aircraft.restored": "restored aircraft",
  "aircraft.restored_bulk": "restored aircraft",
  "airport.created": "added airport",
  "airport.updated": "updated airport",
  "airport.removed": "archived airport",
  "airport.removed_bulk": "archived airport",
  "airport.restored": "restored airport",
  "airport.restored_bulk": "restored airport",
  "charter_rate.set": "updated a charter rate",
  "referral.submitted": "submitted a referral",
  "referral.converted": "converted a referral",
  "referral.archived": "archived a referral",
  "referral.restored": "restored a referral",
  "user.invited": "invited",
  "user.invitation_accepted": "accepted the invitation —",
  "document.added": "filed a document for",
  "document.updated": "updated a document for",
  "document.replaced": "replaced a document for",
  "document.archived": "archived a document for",
  "document.restored": "restored a document for",
  "upload.created": "uploaded a file",
  "upload.removed": "archived a file",
  "upload.restored": "restored a file",
};

const humanise = (action) => String(action ?? "").replace(/[._]/g, " ").trim();

/** Where a subject opens. Kinds with no page of their own open nothing. */
const SUBJECT_HREFS = {
  Trip: (id) => `/dashboard/trips/${id}`,
  Client: (id) => `/dashboard/clients/${id}`,
  Quote: (id) => `/dashboard/quotes/${id}`,
  Operator: (id) => `/dashboard/operators/${id}`,
  Aircraft: (id) => `/dashboard/aircraft/${id}`,
  Invoice: (id) => `/dashboard/receivables?invoice=${id}`,
  OperatorPayable: (id) => `/dashboard/operator-payments?bill=${id}`,
  Task: (id) => `/dashboard/tasks-board?task=${id}`,
};

/** "2h ago", "Yesterday", or the date — relative to now, for a feed. */
export function timeAgo(value) {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return DASH;
  const minutes = Math.floor((Date.now() - at.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(at);
}

/** One feed line: who, what, which record, when. */
export function toActivityItem(entry) {
  const name = entry?.actor ? actorName(entry.actor) : "System";
  const subject = entry?.subject ?? null;
  const toHref = subject ? SUBJECT_HREFS[subject.type] : null;
  return {
    id: entry?.id,
    name,
    action: ACTIVITY_PHRASES[entry?.action] ?? humanise(entry?.action),
    subject: subject?.label ?? "",
    href: toHref ? toHref(subject.id) : null,
    time: timeAgo(entry?.createdAt),
  };
}
