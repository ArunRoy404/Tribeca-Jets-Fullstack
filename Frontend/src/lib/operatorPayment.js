import { formatPaymentTerms } from "@/lib/operator";
import { toArchiveFields } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoneyExact } from "@/lib/money";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";
import { formatPaymentMethod } from "@/lib/payment";

/**
 * Display helpers for Operator Payments (#17).
 *
 * The API computes `total`, `paid`, `balance` and `state` on every read from
 * the bill and its live payments. Nothing here adds them up again. Money is
 * shown to the cent — these figures reconcile against a bank statement.
 */

const DASH = "—";

/** Where a bill stands — computed by the API, and the board's filter. */
export const PAYABLE_STATES = ["DUE", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const STATE_LABELS = {
  DUE: "Due",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};
export const formatPayableState = (v) => (v ? (STATE_LABELS[v] ?? v) : DASH);

/** What a person sets. */
export const PAYABLE_STATUSES = ["OPEN", "CANCELLED"];
const STATUS_LABELS = { OPEN: "Open", CANCELLED: "Cancelled" };
export const formatPayableStatus = (v) => (v ? (STATUS_LABELS[v] ?? v) : DASH);

/** A trip's position with its operators — the trips board's "Op Pmt". */
const TRIP_LABELS = {
  NOT_RECORDED: "Not Recorded",
  DUE: "Due",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};
export const formatTripOperatorState = (v) => (v ? (TRIP_LABELS[v] ?? v) : DASH);

const money = (value) => (value === null || value === undefined ? DASH : formatMoneyExact(value));

/** A row on the Operator Payments board, a card, or a line on an operator's tab. */
export function toPayableRow(payable) {
  const trip = payable?.trip;
  const last = payable?.lastPayment;
  return {
    id: payable?.id,
    number: payable?.number || DASH,
    tripId: payable?.tripId ?? null,
    tripReference: trip?.reference ? `TJ-${trip.reference}` : DASH,
    tripDate: formatCalendarDate(trip?.departureDate),
    client: trip?.client ? displayName(trip.client) : DASH,
    operatorId: payable?.operatorId ?? null,
    operator: payable?.operator?.name ?? DASH,
    // The operator's terms as words ("Net 30") — an enum since Operators' review.
    paymentTerms: formatPaymentTerms(payable?.operator?.paymentTerms),
    operatorReference: payable?.operatorReference || null,
    total: money(payable?.total),
    paid: money(payable?.paid),
    balance: money(payable?.balance),
    hasBalance: Number(payable?.balance) > 0,
    due: formatCalendarDate(payable?.dueDate),
    state: formatPayableState(payable?.state),
    rawState: payable?.state ?? null,
    rawStatus: payable?.status ?? null,
    broker: trip?.assignedBroker ? personName(trip.assignedBroker) : "Unassigned",
    method: last ? formatPaymentMethod(last.method) : DASH,
    lastPaid: last ? formatCalendarDate(last.paidAt) : DASH,
    paymentCount: payable?.paymentCount ?? 0,
    notes: payable?.notes ?? null,
    raw: payable,
    ...toArchiveFields(payable),
  };
}

/**
 * The trip's `operatorPayment`. Undefined (the caller may not read operator
 * payments) reads as a dash; no bill recorded reads "Not Recorded".
 */
export function toTripOperatorPayment(operatorPayment) {
  if (!operatorPayment) return { state: DASH, owed: DASH, paid: DASH, balance: DASH, known: false };
  const any = operatorPayment.payableCount > 0;
  return {
    state: formatTripOperatorState(operatorPayment.state),
    rawState: operatorPayment.state,
    owed: any ? money(operatorPayment.owed) : DASH,
    paid: any ? money(operatorPayment.paid) : DASH,
    balance: any ? money(operatorPayment.balance) : DASH,
    known: true,
  };
}
