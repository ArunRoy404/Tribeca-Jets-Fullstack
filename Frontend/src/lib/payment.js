/**
 * How money moved — the API's shared `PaymentMethod` enum, used by client
 * payments (Receivables) and commissions, and by operator payments when they
 * land. Lifted out of `lib/commission.js` when Receivables became its second
 * user; that file re-exports it under its old names, so no caller moved.
 */

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
