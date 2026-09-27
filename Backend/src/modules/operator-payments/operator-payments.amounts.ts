import { fromCents, toCents } from '../../common/money/cents.js';
import {
  paidCents,
  paymentProblem as settlementProblem,
  settlementState,
  summarise,
  todayUtc,
} from '../../common/money/settlement.js';
import {
  documentNumber,
  referenceFromSearch as sequenceFromSearch,
} from '../../common/database/document-number.js';
import { OperatorPayableStatus } from '../../generated/prisma/enums.js';

/**
 * What an operator's bill comes to, what has been sent and where it stands.
 * The settling arithmetic is shared with Receivables
 * (`common/money/settlement.ts`); this file adds what only a payable has — a
 * cancellation, the OP number, the tiles and "due this week".
 */

export { paidCents, todayUtc };

type Money = { toString(): string } | number;

export const PayableState = {
  DUE: 'DUE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type PayableState = (typeof PayableState)[keyof typeof PayableState];
export const PAYABLE_STATES = Object.values(PayableState) as [PayableState, ...PayableState[]];

/** A trip's position with its operators across all of its payables. */
export const TripOperatorPaymentState = {
  /** No live bill recorded for this trip. */
  NOT_RECORDED: 'NOT_RECORDED',
  DUE: 'DUE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type TripOperatorPaymentState = (typeof TripOperatorPaymentState)[keyof typeof TripOperatorPaymentState];

export interface PayableInputs {
  amount: Money;
  status: OperatorPayableStatus;
  dueDate: Date | null;
  /** The live payments only. */
  payments: { amount: Money }[];
}

export interface PayableFigures {
  total: number;
  paid: number;
  balance: number;
  state: PayableState;
}

export function payableState(
  status: OperatorPayableStatus,
  total: number,
  paid: number,
  dueDate: Date | null,
  today: Date = todayUtc(),
): PayableState {
  if (status === OperatorPayableStatus.CANCELLED) return PayableState.CANCELLED;
  return settlementState(total, paid, dueDate, today);
}

export function payableFigures(payable: PayableInputs, today: Date = todayUtc()): PayableFigures {
  const total = toCents(payable.amount);
  const paid = paidCents(payable.payments);
  return {
    total: fromCents(total),
    paid: fromCents(paid),
    balance: fromCents(Math.max(0, total - paid)),
    state: payableState(payable.status, total, paid, payable.dueDate, today),
  };
}

/** An operator is never paid past what they billed. */
export function paymentProblem(total: number, otherPaid: number, amount: number): string | null {
  return settlementProblem(total, otherPaid, amount, 'An operator is never paid past what they billed — correct the bill first if it changed.');
}

/** "OP-2026-0045". */
export function payableNumber(reference: number, createdAt: Date): string {
  return documentNumber('OP', reference, createdAt);
}

export function referenceFromSearch(term: string): number | null {
  return sequenceFromSearch(term, 'OP');
}

export interface PayableTotals {
  /** Every open bill, its full amount. */
  payable: number;
  /** Every live payment on a live bill. */
  paid: number;
  /** What open bills still have owing. */
  outstanding: number;
  overdue: number;
  overdueCount: number;
  /** Open bills with money owing, due today or in the next six days. */
  dueThisWeek: number;
  dueThisWeekAmount: number;
  counts: Record<PayableState, number>;
  count: number;
}

/** The tiles, summed in cents. A cancelled bill is owed to nobody. */
export function tally(payables: PayableInputs[], today: Date = todayUtc()): PayableTotals {
  const counts = Object.fromEntries(PAYABLE_STATES.map((state) => [state, 0])) as Record<PayableState, number>;
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  let payable = 0;
  let paid = 0;
  let outstanding = 0;
  let overdue = 0;
  let dueThisWeek = 0;
  let dueThisWeekAmount = 0;

  for (const row of payables) {
    const total = toCents(row.amount);
    const sent = paidCents(row.payments);
    const state = payableState(row.status, total, sent, row.dueDate, today);
    counts[state] += 1;
    if (state === PayableState.CANCELLED) continue;
    const owing = Math.max(0, total - sent);
    payable += total;
    paid += sent;
    outstanding += owing;
    if (state === PayableState.OVERDUE) overdue += owing;
    if (owing > 0 && state !== PayableState.OVERDUE && row.dueDate && row.dueDate.getTime() < weekEnd.getTime()) {
      dueThisWeek += 1;
      dueThisWeekAmount += owing;
    }
  }

  return {
    payable: fromCents(payable),
    paid: fromCents(paid),
    outstanding: fromCents(outstanding),
    overdue: fromCents(overdue),
    overdueCount: counts[PayableState.OVERDUE],
    dueThisWeek,
    dueThisWeekAmount: fromCents(dueThisWeekAmount),
    counts,
    count: payables.length,
  };
}

export interface TripOperatorPayment {
  state: TripOperatorPaymentState;
  owed: number;
  paid: number;
  balance: number;
  payableCount: number;
}

/**
 * One trip's position with its operators — the "Op Pmt" column and the trip
 * page's operator paid / balance. Cancelled bills are not owed.
 */
export function tripOperatorPayment(payables: PayableInputs[], today: Date = todayUtc()): TripOperatorPayment {
  const summary = summarise(
    payables
      .filter((row) => row.status === OperatorPayableStatus.OPEN)
      .map((row) => ({ total: toCents(row.amount), paid: paidCents(row.payments), dueDate: row.dueDate })),
    today,
  );
  return {
    state: summary.state === 'NONE' ? TripOperatorPaymentState.NOT_RECORDED : summary.state,
    owed: summary.total,
    paid: summary.paid,
    balance: summary.balance,
    payableCount: summary.count,
  };
}
