import { formatCalendarDate } from "@/lib/date";
import { formatMoneyExact } from "@/lib/money";
import { formatPaymentMethod } from "@/lib/payment";
import { personName } from "@/lib/lead";

/**
 * Display helpers for Transactions (#19) — the money ledger.
 *
 * Every row is a real movement of money read from the module that owns it:
 * a client payment received, an operator payment sent, a commission paid.
 * `href` opens the bill it settles, where it is corrected or withdrawn.
 */

const DASH = "—";

export const MOVEMENT_KINDS = ["CLIENT_PAYMENT", "OPERATOR_PAYMENT", "COMMISSION"];
const KIND_LABELS = {
  CLIENT_PAYMENT: "Client Payment",
  OPERATOR_PAYMENT: "Operator Payment",
  COMMISSION: "Commission",
};
export const formatMovementKind = (v) => (v ? (KIND_LABELS[v] ?? v) : DASH);

/** Where the bill behind a movement lives — its page, with its sheet open. */
function sourceHref(movement) {
  const id = movement?.document?.id;
  if (!id) return null;
  switch (movement?.kind) {
    case "CLIENT_PAYMENT":
      return `/dashboard/receivables?invoice=${id}`;
    case "OPERATOR_PAYMENT":
      return `/dashboard/operator-payments?bill=${id}`;
    case "COMMISSION":
      return `/dashboard/commissions?commission=${id}`;
    default:
      return null;
  }
}

/** A row on the ledger, or a card. */
export function toTransactionRow(movement) {
  const incoming = movement?.direction === "IN";
  const known = movement?.amount !== null && movement?.amount !== undefined;
  return {
    id: movement?.id,
    kind: formatMovementKind(movement?.kind),
    rawKind: movement?.kind ?? null,
    incoming,
    date: formatCalendarDate(movement?.date),
    // Signed for reading only: the API's figure is always positive and the
    // direction says which way it went.
    amount: known ? `${incoming ? "+" : "−"}${formatMoneyExact(movement.amount)}` : "Not yet known",
    known,
    method: formatPaymentMethod(movement?.method),
    reference: movement?.reference || DASH,
    document: movement?.document?.number ?? DASH,
    counterparty: movement?.counterparty?.name || DASH,
    tripId: movement?.trip?.id ?? null,
    tripReference: movement?.trip?.reference ? `TJ-${movement.trip.reference}` : DASH,
    broker: movement?.broker ? personName(movement.broker) : "Unassigned",
    href: sourceHref(movement),
  };
}
