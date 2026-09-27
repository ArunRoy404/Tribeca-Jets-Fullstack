import { fromCents, toCents } from './cents.js';

/**
 * Settling a bill with a ledger of payments — what a client invoice
 * (Receivables) and an operator payable (Operator Payments) both are.
 *
 * Lifted out of `receivables.amounts.ts` when Operator Payments became its
 * second caller (AGENTS.md, "extract on the second copy"). Pure functions,
 * in integer cents, for the reason the credit ledger's are: a balance off by
 * a cent, or a bill that reads "Paid" because a withdrawn payment was still
 * counted, looks right until somebody is chased for money already sent.
 *
 * Nothing here is stored. Paid is the sum of the live payments, the balance is
 * the total less that, and "overdue" is the due date against today.
 */

type Money = { toString(): string } | number;

/** Where a live bill stands once its payments and due date are read. */
export const SettlementState = {
  DUE: 'DUE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type SettlementState = (typeof SettlementState)[keyof typeof SettlementState];

/** Midnight UTC today — the same clock a `@db.Date` due date is stored on. */
export function todayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** The live payments, summed in cents. A withdrawn payment is not money moved. */
export function paidCents(payments: { amount: Money }[]): number {
  return payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
}

/**
 * A live bill's state, in order of precedence: fully paid is paid even if it
 * was paid late; only then does the due date speak. `total` and `paid` are
 * cents. A bill with no due date is never overdue.
 */
export function settlementState(
  total: number,
  paid: number,
  dueDate: Date | null,
  today: Date = todayUtc(),
): SettlementState {
  if (total > 0 && paid >= total) return SettlementState.PAID;
  if (dueDate && dueDate.getTime() < today.getTime()) return SettlementState.OVERDUE;
  if (paid > 0) return SettlementState.PARTIALLY_PAID;
  return SettlementState.DUE;
}

/** "$1,234.50" from cents, for a message. */
export function formatDollars(cents: number): string {
  return `$${fromCents(cents).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * What would be wrong with `amount` more against a bill whose total is
 * `total` and which already holds `otherPaid` (all cents) — or null when it
 * fits. A bill is never paid past its total. `overflow` says where the excess
 * belongs instead, in the caller's own words.
 */
export function paymentProblem(total: number, otherPaid: number, amount: number, overflow = ''): string | null {
  const room = total - otherPaid;
  if (amount <= room) return null;
  if (room <= 0) return 'This is already paid in full.';
  return `That is more than the ${formatDollars(room)} still owed.${overflow ? ` ${overflow}` : ''}`;
}

/** One live bill, reduced to what a summary needs (cents). */
export interface Settled {
  total: number;
  paid: number;
  dueDate: Date | null;
}

export interface Summary {
  /** NONE when there is no live bill at all. */
  state: SettlementState | 'NONE';
  total: number;
  paid: number;
  balance: number;
  count: number;
}

/**
 * Several live bills as one position — a trip's billing across its invoices,
 * or what is owed to its operator. Overdue if any one is late; paid when the
 * whole balance is; partly paid when anything has come in. Returned in whole
 * currency.
 */
export function summarise(bills: Settled[], today: Date = todayUtc()): Summary {
  let total = 0;
  let paid = 0;
  let late = false;
  for (const bill of bills) {
    total += bill.total;
    paid += bill.paid;
    if (settlementState(bill.total, bill.paid, bill.dueDate, today) === SettlementState.OVERDUE) late = true;
  }
  const balance = Math.max(0, total - paid);
  const state =
    bills.length === 0
      ? 'NONE'
      : late
        ? SettlementState.OVERDUE
        : balance === 0
          ? SettlementState.PAID
          : paid > 0
            ? SettlementState.PARTIALLY_PAID
            : SettlementState.DUE;
  return { state, total: fromCents(total), paid: fromCents(paid), balance: fromCents(balance), count: bills.length };
}
