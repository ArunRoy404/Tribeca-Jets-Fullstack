import { toArchiveFields } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoneyExact } from "@/lib/money";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";

/**
 * Display helpers for Commissions (#11's Commission Center).
 *
 * The API computes `estimatedAmount` from the trip's computed profit and
 * `value` (final once settled, the estimate until then) on every read. Nothing
 * here recalculates either: a second copy of the arithmetic in JavaScript
 * disagrees with the server the first time a rounding rule changes. A null
 * estimate — a share of a profit nobody knows yet — reads as "Not yet known",
 * never $0.
 */

const DASH = "—";

export const COMMISSION_STATUSES = ["PENDING", "EARNED", "PAID", "CANCELLED"];
const STATUS_LABELS = { PENDING: "Pending", EARNED: "Earned", PAID: "Paid", CANCELLED: "Cancelled" };
export const formatCommissionStatus = (v) => (v ? (STATUS_LABELS[v] ?? v) : DASH);

export const COMMISSION_BASES = ["PERCENT_OF_PROFIT", "FLAT_FEE", "CUSTOM"];
const BASIS_LABELS = {
  PERCENT_OF_PROFIT: "Percentage of profit",
  FLAT_FEE: "Flat fee",
  CUSTOM: "Custom amount",
};
export const formatCommissionBasis = (v) => (v ? (BASIS_LABELS[v] ?? v) : DASH);

export const COMMISSION_METHODS = ["WIRE_TRANSFER", "ACH", "CHECK", "ZELLE", "CREDIT_CARD", "OTHER"];
const METHOD_LABELS = {
  WIRE_TRANSFER: "Wire Transfer",
  ACH: "ACH",
  CHECK: "Check",
  ZELLE: "Zelle",
  CREDIT_CARD: "Credit Card",
  OTHER: "Other",
};
export const formatCommissionMethod = (v) => (v ? (METHOD_LABELS[v] ?? v) : DASH);

export const RECIPIENT_TYPES = ["REFERRAL_AGENT", "CLIENT", "MANUAL"];
const RECIPIENT_LABELS = { REFERRAL_AGENT: "Referral Agent", CLIENT: "CRM Client", MANUAL: "Manual" };
export const formatRecipientType = (v) => (v ? (RECIPIENT_LABELS[v] ?? v) : DASH);

const money = (value) => (value === null || value === undefined ? null : formatMoneyExact(value));

/**
 * The structure, in words: "10% of profit", "Flat fee · $1,500.00".
 * Works for a commission and for a referral agent's standing terms alike.
 */
export function formatStructure({ basis, percentage, amount } = {}) {
  if (!basis) return "Not set";
  if (basis === "PERCENT_OF_PROFIT") {
    return percentage === null || percentage === undefined ? "Percentage of profit" : `${Number(percentage)}% of profit`;
  }
  const figure = money(amount);
  return figure ? `${formatCommissionBasis(basis)} · ${figure}` : formatCommissionBasis(basis);
}

/** A row on the Commissions board, or a card. */
export function toCommissionRow(commission) {
  const trip = commission?.trip;
  return {
    id: commission?.id,
    reference: commission?.reference ? `COM-${commission.reference}` : DASH,
    recipient: commission?.recipientLabel || DASH,
    type: formatRecipientType(commission?.recipientType),
    rawType: commission?.recipientType ?? null,
    tripId: commission?.tripId ?? null,
    tripReference: trip?.reference ? `TJ-${trip.reference}` : DASH,
    tripDate: formatCalendarDate(trip?.departureDate),
    client: trip?.client ? displayName(trip.client) : DASH,
    structure: formatStructure(commission),
    estimated: money(commission?.estimatedAmount) ?? "Not yet known",
    final: money(commission?.finalAmount) ?? DASH,
    amount: money(commission?.value) ?? "Not yet known",
    paidAt: formatCalendarDate(commission?.paidAt),
    method: formatCommissionMethod(commission?.method),
    status: formatCommissionStatus(commission?.status),
    rawStatus: commission?.status ?? null,
    broker: commission?.broker ? personName(commission.broker) : DASH,
    referral: commission?.referral
      ? { id: commission.referral.id, reference: `RF-${commission.referral.reference}` }
      : null,
    notes: commission?.notes ?? null,
    raw: commission,
    ...toArchiveFields(commission),
  };
}

/**
 * The partner portal's view (#11's Commission Center): client/trip, trip date,
 * structure, estimated, final, status and payment date — what the API sends a
 * referral agent, and nothing more.
 */
export function toPartnerCommission(commission) {
  return {
    id: commission?.id,
    reference: commission?.reference ? `COM-${commission.reference}` : DASH,
    client: commission?.clientName || DASH,
    trip: commission?.trip?.reference ? `TJ-${commission.trip.reference}` : DASH,
    tripDate: formatCalendarDate(commission?.trip?.departureDate),
    structure: formatStructure(commission),
    estimated: money(commission?.estimatedAmount) ?? "Not yet known",
    final: money(commission?.finalAmount) ?? DASH,
    status: formatCommissionStatus(commission?.status),
    paidAt: formatCalendarDate(commission?.paidAt),
  };
}
