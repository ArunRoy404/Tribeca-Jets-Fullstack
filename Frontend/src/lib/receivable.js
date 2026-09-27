import { toArchiveFields, actorName, formatTimestamp } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoneyExact } from "@/lib/money";
import { displayName } from "@/lib/client";
import { personName } from "@/lib/lead";
import { formatPaymentMethod } from "@/lib/payment";

/**
 * Display helpers for Receivables (#16).
 *
 * The API computes `total`, `paid`, `balance` and `state` on every read from
 * the invoice and its live payments. Nothing here adds them up again: a second
 * copy of the arithmetic in JavaScript disagrees with the server the first
 * time a rounding rule changes. Money is shown to the cent — an invoice is an
 * amount somebody has to reconcile against a bank statement.
 */

const DASH = "—";

/** Where an invoice stands — computed by the API, and the board's filter. */
export const INVOICE_STATES = ["DRAFT", "DUE", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const STATE_LABELS = {
  DRAFT: "Draft",
  DUE: "Due",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};
export const formatInvoiceState = (v) => (v ? (STATE_LABELS[v] ?? v) : DASH);

/** What a person sets. The rest of the states follow from the payments. */
export const INVOICE_STATUSES = ["DRAFT", "SENT", "CANCELLED"];
const STATUS_LABELS = { DRAFT: "Draft", SENT: "Sent", CANCELLED: "Cancelled" };
export const formatInvoiceStatus = (v) => (v ? (STATUS_LABELS[v] ?? v) : DASH);

/** A trip's billing across all its invoices — the trips board's "Client Pmt". */
const TRIP_PAYMENT_LABELS = {
  NOT_INVOICED: "Not Invoiced",
  DUE: "Due",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};
export const formatTripPaymentState = (v) => (v ? (TRIP_PAYMENT_LABELS[v] ?? v) : DASH);

const money = (value) => (value === null || value === undefined ? DASH : formatMoneyExact(value));

/** A row on the Receivables board, a card, or a line on a client's Payments tab. */
export function toReceivableRow(invoice) {
  const trip = invoice?.trip;
  const last = invoice?.lastPayment;
  return {
    id: invoice?.id,
    number: invoice?.number || DASH,
    tripId: invoice?.tripId ?? null,
    tripReference: trip?.reference ? `TJ-${trip.reference}` : DASH,
    tripDate: formatCalendarDate(trip?.departureDate),
    clientId: invoice?.clientId ?? null,
    client: invoice?.client ? displayName(invoice.client) : DASH,
    /** True when somebody other than the trip's client is billed — a travel agent. */
    billedElsewhere: Boolean(trip?.clientId && invoice?.clientId && trip.clientId !== invoice.clientId),
    amount: money(invoice?.amount),
    fet: money(invoice?.fetAmount),
    total: money(invoice?.total),
    paid: money(invoice?.paid),
    balance: money(invoice?.balance),
    hasBalance: Number(invoice?.balance) > 0,
    issued: formatCalendarDate(invoice?.issuedAt),
    due: formatCalendarDate(invoice?.dueDate),
    state: formatInvoiceState(invoice?.state),
    rawState: invoice?.state ?? null,
    rawStatus: invoice?.status ?? null,
    broker: trip?.assignedBroker ? personName(trip.assignedBroker) : "Unassigned",
    method: last ? formatPaymentMethod(last.method) : DASH,
    lastPaid: last ? formatCalendarDate(last.paidAt) : DASH,
    paymentCount: invoice?.paymentCount ?? 0,
    notes: invoice?.notes ?? null,
    raw: invoice,
    ...toArchiveFields(invoice),
  };
}

/** One payment on the sheet's ledger. */
export function toPaymentRow(payment) {
  return {
    id: payment?.id,
    amount: money(payment?.amount),
    rawAmount: payment?.amount ?? null,
    paidAt: formatCalendarDate(payment?.paidAt),
    method: formatPaymentMethod(payment?.method),
    reference: payment?.reference || null,
    notes: payment?.notes || null,
    recordedBy: actorName(payment?.createdBy),
    withdrawnBy: payment?.deletedAt ? actorName(payment?.deletedBy) : null,
    withdrawnAt: payment?.deletedAt ? formatTimestamp(payment.deletedAt) : null,
    raw: payment,
  };
}

/**
 * The trip board's and trip page's view of `trip.clientPayment`. Undefined
 * (the caller may not read receivables) and a trip with nothing sent both have
 * an honest reading: a dash, and "Not Invoiced".
 */
export function toTripPayment(clientPayment) {
  if (!clientPayment) return { state: DASH, invoiced: DASH, paid: DASH, balance: DASH, known: false };
  return {
    state: formatTripPaymentState(clientPayment.state),
    rawState: clientPayment.state,
    invoiced: clientPayment.invoiceCount > 0 ? money(clientPayment.invoiced) : DASH,
    paid: clientPayment.invoiceCount > 0 ? money(clientPayment.paid) : DASH,
    balance: clientPayment.invoiceCount > 0 ? money(clientPayment.balance) : DASH,
    known: true,
  };
}
