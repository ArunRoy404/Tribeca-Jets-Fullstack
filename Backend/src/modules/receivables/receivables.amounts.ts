import { fromCents, toCents } from '../../common/money/cents.js';
import { InvoiceStatus } from '../../generated/prisma/enums.js';

/**
 * What an invoice is worth, what has come in against it and where it stands —
 * as pure functions, for the same reason the credit ledger's arithmetic is: a
 * balance off by a cent, or an invoice that reads "Paid" because a withdrawn
 * wire was still being counted, looks right until somebody is chased for money
 * they already sent.
 *
 * Nothing here is stored. The paid figure is the sum of the live payments,
 * the balance is the total less that, and "overdue" is the due date against
 * today — all worked out on every read.
 */

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

/** Midnight UTC today — the same clock a `@db.Date` due date is stored on. */
export function todayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function totalCents(invoice: Pick<InvoiceInputs, 'amount' | 'fetAmount'>): number {
  return toCents(invoice.amount) + toCents(invoice.fetAmount);
}

export function paidCents(payments: { amount: Money }[]): number {
  return payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
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
  if (dueDate && dueDate.getTime() < today.getTime()) return InvoiceState.OVERDUE;
  if (paid > 0) return InvoiceState.PARTIALLY_PAID;
  return InvoiceState.DUE;
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
 * What would be wrong with `amountCents` more coming in against an invoice
 * whose total is `totalCents` and which already holds `otherPaidCents` — or
 * null when it fits. An invoice is never paid past its total: an overpayment
 * is a credit on the client's account, and recording it here would make the
 * invoice say the client owes a negative amount.
 */
export function paymentProblem(total: number, otherPaid: number, amount: number): string | null {
  const room = total - otherPaid;
  if (amount <= room) return null;
  return room <= 0
    ? 'This invoice is already paid in full.'
    : `That is more than the ${formatDollars(room)} still owed on this invoice. Record the rest as a client credit.`;
}

/** "$1,234.50" from cents, for a message. */
export function formatDollars(cents: number): string {
  return `$${fromCents(cents).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * "INV-2026-0042": the year the invoice was created and its sequence. Both are
 * fixed at creation, so the number the client was sent never changes.
 */
export function invoiceNumber(reference: number, createdAt: Date): string {
  return `INV-${createdAt.getUTCFullYear()}-${String(reference).padStart(4, '0')}`;
}

/**
 * The sequence a search term names — "INV-2026-0042", "INV-42", "0042", "42" —
 * or null when it names none.
 */
export function referenceFromSearch(term: string): number | null {
  const match = /^(?:INV-?)?(?:\d{4}-)?0*(\d{1,9})$/i.exec(term.trim());
  if (!match) return null;
  const reference = Number(match[1]);
  return reference > 0 ? reference : null;
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
  const billed = invoices.filter((invoice) => invoice.status === InvoiceStatus.SENT);
  let invoiced = 0;
  let paid = 0;
  let late = false;
  for (const invoice of billed) {
    const total = totalCents(invoice);
    const received = paidCents(invoice.payments);
    invoiced += total;
    paid += received;
    if (invoiceState(invoice.status, total, received, invoice.dueDate, today) === InvoiceState.OVERDUE) late = true;
  }
  const balance = Math.max(0, invoiced - paid);
  const state =
    billed.length === 0
      ? TripPaymentState.NOT_INVOICED
      : late
        ? TripPaymentState.OVERDUE
        : balance === 0
          ? TripPaymentState.PAID
          : paid > 0
            ? TripPaymentState.PARTIALLY_PAID
            : TripPaymentState.DUE;
  return {
    state,
    invoiced: fromCents(invoiced),
    paid: fromCents(paid),
    balance: fromCents(balance),
    invoiceCount: billed.length,
  };
}
