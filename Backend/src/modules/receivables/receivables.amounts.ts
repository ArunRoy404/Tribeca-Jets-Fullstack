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
import { InvoiceStatus } from '../../generated/prisma/enums.js';

/**
 * What an invoice is worth, what has come in against it and where it stands.
 *
 * The settling arithmetic — paid, balance, due / partly paid / paid / overdue
 * — is shared with Operator Payments in `common/money/settlement.ts`; this
 * file adds what only an invoice has: a draft that has not been sent, a
 * cancellation, the FET on the charge, the INV number, and the tiles.
 */

export { paidCents, todayUtc };

type Money = { toString(): string } | number;

/**
 * Where an invoice stands, as the scope names it (§6.14: "unpaid, partially
 * paid, paid, overdue"), plus the two states a person sets. `DUE` is the
 * scope's "unpaid": sent, nothing in, not yet late.
 */
export const InvoiceState = {
  DRAFT: 'DRAFT',
  DUE: 'DUE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceState = (typeof InvoiceState)[keyof typeof InvoiceState];
export const INVOICE_STATES = Object.values(InvoiceState) as [InvoiceState, ...InvoiceState[]];

/** A trip's billing position across all of its invoices. */
export const TripPaymentState = {
  /** Nothing sent yet — no invoice, or only drafts and cancelled ones. */
  NOT_INVOICED: 'NOT_INVOICED',
  DUE: 'DUE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type TripPaymentState = (typeof TripPaymentState)[keyof typeof TripPaymentState];

export interface InvoiceInputs {
  amount: Money;
  fetAmount: Money;
  status: InvoiceStatus;
  dueDate: Date | null;
  /** The live payments only — a withdrawn payment is not money received. */
  payments: { amount: Money }[];
}

export interface InvoiceFigures {
  total: number;
  paid: number;
  balance: number;
  state: InvoiceState;
}

export function totalCents(invoice: Pick<InvoiceInputs, 'amount' | 'fetAmount'>): number {
  return toCents(invoice.amount) + toCents(invoice.fetAmount);
}

/**
 * The state, in order of precedence. A cancelled invoice is cancelled however
 * much it once said; a fully paid one is paid even if it was paid late; a
 * draft with nothing against it has not been sent, so it cannot be late.
 * Only then does the due date speak.
 */
export function invoiceState(
  status: InvoiceStatus,
  total: number,
  paid: number,
  dueDate: Date | null,
  today: Date = todayUtc(),
): InvoiceState {
  if (status === InvoiceStatus.CANCELLED) return InvoiceState.CANCELLED;
  if (total > 0 && paid >= total) return InvoiceState.PAID;
  if (status === InvoiceStatus.DRAFT) return InvoiceState.DRAFT;
  return settlementState(total, paid, dueDate, today);
}

/** Everything the screen reads about one invoice's money, in whole currency. */
export function invoiceFigures(invoice: InvoiceInputs, today: Date = todayUtc()): InvoiceFigures {
  const total = totalCents(invoice);
  const paid = paidCents(invoice.payments);
  return {
    total: fromCents(total),
    paid: fromCents(paid),
    balance: fromCents(Math.max(0, total - paid)),
    state: invoiceState(invoice.status, total, paid, invoice.dueDate, today),
  };
}

/**
 * An invoice is never paid past its total: an overpayment is a credit on the
 * client's account, and recording it here would make the invoice say the
 * client owes a negative amount.
 */
export function paymentProblem(total: number, otherPaid: number, amount: number): string | null {
  return settlementProblem(total, otherPaid, amount, 'Record the rest as a client credit.');
}

/** "INV-2026-0042". */
export function invoiceNumber(reference: number, createdAt: Date): string {
  return documentNumber('INV', reference, createdAt);
}

/** The invoice sequence a search term names, or null. */
export function referenceFromSearch(term: string): number | null {
  return sequenceFromSearch(term, 'INV');
}

export interface ReceivableTotals {
  /** Sent invoices, their full value. */
  invoiced: number;
  /** Every live payment on a live invoice. */
  collected: number;
  /** What sent invoices still have owing. */
  outstanding: number;
  overdue: number;
  overdueCount: number;
  counts: Record<InvoiceState, number>;
  count: number;
}

/**
 * The tiles, summed in cents. A draft is not invoiced — the client has not
 * seen it — and a cancelled invoice is owed by nobody.
 */
export function tally(invoices: InvoiceInputs[], today: Date = todayUtc()): ReceivableTotals {
  const counts = Object.fromEntries(INVOICE_STATES.map((state) => [state, 0])) as Record<InvoiceState, number>;
  let invoiced = 0;
  let collected = 0;
  let outstanding = 0;
  let overdue = 0;

  for (const invoice of invoices) {
    const total = totalCents(invoice);
    const paid = paidCents(invoice.payments);
    const state = invoiceState(invoice.status, total, paid, invoice.dueDate, today);
    counts[state] += 1;
    if (state === InvoiceState.CANCELLED) continue;
    collected += paid;
    if (invoice.status !== InvoiceStatus.SENT) continue;
    const owing = Math.max(0, total - paid);
    invoiced += total;
    outstanding += owing;
    if (state === InvoiceState.OVERDUE) overdue += owing;
  }

  return {
    invoiced: fromCents(invoiced),
    collected: fromCents(collected),
    outstanding: fromCents(outstanding),
    overdue: fromCents(overdue),
    overdueCount: counts[InvoiceState.OVERDUE],
    counts,
    count: invoices.length,
  };
}

export interface TripPayment {
  state: TripPaymentState;
  invoiced: number;
  paid: number;
  balance: number;
  invoiceCount: number;
}

/**
 * One trip's billing, across its invoices — the "Client Pmt" column on the
 * trips board and the paid/balance boxes on the trip page. Drafts and
 * cancelled invoices are not billing, so a trip with only those is
 * NOT_INVOICED rather than "Due".
 */
export function tripPayment(invoices: InvoiceInputs[], today: Date = todayUtc()): TripPayment {
  const summary = summarise(
    invoices
      .filter((invoice) => invoice.status === InvoiceStatus.SENT)
      .map((invoice) => ({ total: totalCents(invoice), paid: paidCents(invoice.payments), dueDate: invoice.dueDate })),
    today,
  );
  return {
    state: summary.state === 'NONE' ? TripPaymentState.NOT_INVOICED : summary.state,
    invoiced: summary.total,
    paid: summary.paid,
    balance: summary.balance,
    invoiceCount: summary.count,
  };
}
