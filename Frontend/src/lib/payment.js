/**
 * How money moved — the API's shared `PaymentMethod` enum, used by client
 * payments (Receivables) and commissions, and by operator payments when they
 * land. Lifted out of `lib/commission.js` when Receivables became its second
 * user; that file re-exports it under its old names, so no caller moved.
 */

import { actorName, formatTimestamp } from "@/lib/archive";
import { formatCalendarDate } from "@/lib/date";
import { formatMoneyExact } from "@/lib/money";

const DASH = "—";

export const PAYMENT_METHODS = ["WIRE_TRANSFER", "ACH", "CHECK", "ZELLE", "CREDIT_CARD", "OTHER"];

const METHOD_LABELS = {
  WIRE_TRANSFER: "Wire Transfer",
  ACH: "ACH",
  CHECK: "Check",
  ZELLE: "Zelle",
  CREDIT_CARD: "Credit Card",
  OTHER: "Other",
};

export const formatPaymentMethod = (v) => (v ? (METHOD_LABELS[v] ?? v) : DASH);

/**
 * One payment on a bill's ledger — a client invoice's (Receivables) or an
 * operator bill's (Operator Payments). The API sends both the same shape.
 */
export function toPaymentRow(payment) {
  return {
    id: payment?.id,
    amount: payment?.amount === null || payment?.amount === undefined ? DASH : formatMoneyExact(payment.amount),
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
