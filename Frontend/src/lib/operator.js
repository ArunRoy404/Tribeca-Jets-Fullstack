import { toArchiveFields } from "@/lib/archive";
import { toAircraftRow } from "@/lib/aircraft";

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
};

/** Every status, for the table filter and the form's picker. */
export const FILTERABLE_OPERATOR_STATUSES = ["ACTIVE", "PREFERRED", "INACTIVE"];

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
 * `totalTrips` and `totalPaid` are columns the design calls for that nothing
 * can supply yet — they are aggregates over trips and operator payments, which
 * do not exist. The API returns null and they render as an em dash, because a
 * confident "0 trips" against an operator the desk has flown twice is a wrong
 * answer and "—" is an honest one.
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

    aircraftTypes: operator?.aircraftTypes ?? [],
    serviceRoutes: operator?.serviceRoutes ?? [],

    reliability: formatReliability(operator?.reliabilityRating),
    rawReliability: operator?.reliabilityRating ?? null,
    safety: operator?.safetyRating ?? "—",
    responseSpeed: operator?.responseSpeed ?? "—",

    cancellationPolicy: operator?.cancellationPolicy ?? "—",
    paymentTerms: operator?.paymentTerms ?? "—",
    sourcingNotes: operator?.sourcingNotes ?? "",

    // Audit trail, present on every record in every module.
    createdAt: operator?.createdAt ?? null,
    updatedAt: operator?.updatedAt ?? null,

    // Archive trail: who removed it, who brought it back, and whether the
    // live row should carry the "Restored" badge.
    ...toArchiveFields(operator),

    // Awaiting the trips and payments modules.
    totalTrips: operator?.totalTrips ?? "—",
    totalPaid: operator?.totalPaid ?? "—",
    tripHistory: operator?.tripHistory ?? [],
    payments: operator?.payments ?? [],

    // The fleet is real now that Aircraft has shipped. Mapped through the
    // aircraft module's own mapper rather than a second vocabulary here, so
    // the Fleet tab and the aircraft table format a tail identically.
    fleet: (operator?.fleet ?? []).map(toAircraftRow),
    fleetSize: operator?.fleetSize ?? (operator?.fleet ?? []).length,
  };
}
