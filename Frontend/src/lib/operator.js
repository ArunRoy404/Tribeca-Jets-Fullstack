import { toArchiveFields } from "@/lib/archive";
import { toAircraftRow } from "@/lib/aircraft";
import { formatMoney } from "@/lib/money";

/**
 * Display helpers for operators.
 *
 * The API returns statuses as enum constants (`PREFERRED`); the UI shows them
 * as words. Kept here rather than in a component so the table, the cards and
 * the detail page label them identically.
 */

const STATUS_LABELS = {
  ACTIVE: "Active",
  PREFERRED: "Preferred",
  INACTIVE: "Inactive",
  // "Do not book until further notice" — an incident, a lapsed certificate.
  SUSPENDED: "Suspended",
};

/** Every status, for the table filter and the form's picker. */
export const FILTERABLE_OPERATOR_STATUSES = ["ACTIVE", "PREFERRED", "INACTIVE", "SUSPENDED"];

/** The desk's judgment of how fast they answer a quote request. */
export const RESPONSE_SPEED_OPTIONS = [
  { value: "FAST", label: "Fast" },
  { value: "AVERAGE", label: "Average" },
  { value: "SLOW", label: "Slow" },
];

/** When the operator expects to be paid. */
export const PAYMENT_TERMS_OPTIONS = [
  { value: "PREPAID", label: "Prepaid" },
  { value: "DUE_ON_RECEIPT", label: "Due on receipt" },
  { value: "NET_7", label: "Net 7" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
];

const labelOf = (options, value) => options.find((option) => option.value === value)?.label ?? null;

export const formatResponseSpeed = (value) => labelOf(RESPONSE_SPEED_OPTIONS, value);
/** "Net 30", or null when none is on file. Read by Operator Payments too. */
export const formatPaymentTerms = (value) => labelOf(PAYMENT_TERMS_OPTIONS, value);

export function formatOperatorStatus(status) {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}

/** Out of 5, one decimal, as the card renders it. */
export function formatReliability(value) {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "—";
}

/**
 * Maps one API operator onto the props the table, cards and detail page render.
 *
 * `totalTrips` is a real count since Trips (#11) shipped. `totalPaid` is every
 * live payment sent to the operator (Operator Payments, #17), summed by the
 * API — null, and so an em dash, for a caller who does not see every
 * operator bill; never "$0" standing in for "not yours to see".
 */
export function toOperatorRow(operator) {
  return {
    id: operator?.id,
    name: operator?.name,
    status: formatOperatorStatus(operator?.status),
    rawStatus: operator?.status,
    homeBase: operator?.homeBase ?? "—",
    website: operator?.website ?? null,

    primaryContact: operator?.primaryContact ?? "—",
    // The table's Contact column shows the named contact; the general line is
    // the fallback when nobody is named yet.
    email: operator?.contactEmail ?? operator?.generalEmail ?? "—",
    phone: operator?.contactPhone ?? operator?.generalPhone ?? "—",
    generalEmail: operator?.generalEmail ?? null,
    generalPhone: operator?.generalPhone ?? null,
    // The named contact's own lines, for the detail page; `email` / `phone`
    // above fall back to the general ones for the table's single column.
    contactEmail: operator?.contactEmail ?? null,
    contactPhone: operator?.contactPhone ?? null,

    aircraftTypes: operator?.aircraftTypes ?? [],
    serviceRoutes: operator?.serviceRoutes ?? [],

    reliability: formatReliability(operator?.reliabilityRating),
    rawReliability: operator?.reliabilityRating ?? null,
    // The desk's 0–5 safety rating, like reliability: "—" when not rated.
    safety: formatReliability(operator?.safetyRating),
    rawSafety: operator?.safetyRating ?? null,
    rawResponseSpeed: operator?.responseSpeed ?? null,
    responseSpeed: formatResponseSpeed(operator?.responseSpeed) ?? "—",

    cancellationPolicy: operator?.cancellationPolicy ?? "—",
    rawPaymentTerms: operator?.paymentTerms ?? null,
    paymentTerms: formatPaymentTerms(operator?.paymentTerms) ?? "—",
    // Sourcing never offers a suspended operator; the screens say why.
    isSuspended: operator?.status === "SUSPENDED",
    sourcingNotes: operator?.sourcingNotes ?? "",

    // Audit trail, present on every record in every module.
    createdAt: operator?.createdAt ?? null,
    updatedAt: operator?.updatedAt ?? null,

    // Archive trail: who removed it, who brought it back, and whether the
    // live row should carry the "Restored" badge.
    ...toArchiveFields(operator),

    totalTrips: operator?.totalTrips ?? "—",
    totalPaid: operator?.totalPaid === null || operator?.totalPaid === undefined ? "—" : formatMoney(operator.totalPaid),

    // The fleet is real now that Aircraft has shipped. Mapped through the
    // aircraft module's own mapper rather than a second vocabulary here, so
    // the Fleet tab and the aircraft table format a tail identically.
    fleet: (operator?.fleet ?? []).map(toAircraftRow),
    fleetSize: operator?.fleetSize ?? (operator?.fleet ?? []).length,
  };
}
