import { toCents, fromCents } from '../../common/money/cents.js';
import { CommissionBasis, CommissionStatus } from '../../generated/prisma/enums.js';

/**
 * What a commission is worth — as pure functions, for the same reason the
 * credit ledger's arithmetic is: a commission off by a cent, or one that
 * silently reads as $0 because the trip's cost was not in yet, looks right
 * until somebody is paid the wrong amount.
 *
 * Nothing computed here is stored. The estimate follows the trip's profit,
 * which is itself computed on every read from the trip's own inputs, so an
 * edited operator cost moves the commission with it.
 */

type Money = { toString(): string } | number | null;

export interface CommissionTerms {
  basis: CommissionBasis;
  /** Percent of profit, 0–100. Read only for PERCENT_OF_PROFIT. */
  percentage: Money;
  /** The fee or the agreed figure. Read for FLAT_FEE and CUSTOM. */
  amount: Money;
  /** What was actually settled, once it is. */
  finalAmount: Money;
}

/**
 * The working estimate, or null when it cannot be known.
 *
 * A share of profit needs the profit, and a trip without an operator cost has
 * none yet — that is null, never $0, which is a figure somebody would read to
 * an agent down the phone. A flat fee or a custom amount is simply itself.
 */
export function estimateCommission(terms: CommissionTerms, grossProfit: number | null): number | null {
  if (terms.basis === CommissionBasis.PERCENT_OF_PROFIT) {
    if (grossProfit === null || terms.percentage === null) return null;
    // Profit in cents × percentage in hundredths-of-a-percent, rounded once,
    // at the end. A loss-making trip earns no commission rather than a
    // negative one.
    const profitCents = Math.max(0, toCents(grossProfit));
    const basisPoints = toCents(terms.percentage);
    return fromCents(Math.round((profitCents * basisPoints) / 10_000));
  }
  return terms.amount === null ? null : fromCents(toCents(terms.amount));
}

/** The figure that counts: the settled one when there is one, the estimate until then. */
export function commissionValue(terms: CommissionTerms, grossProfit: number | null): number | null {
  if (terms.finalAmount !== null) return fromCents(toCents(terms.finalAmount));
  return estimateCommission(terms, grossProfit);
}

/**
 * What the terms are missing, as a message — or null when they are complete.
 * The basis decides which figure it needs; the other must be absent, so a row
 * never carries a rate it does not use.
 */
export function termsProblem(terms: Pick<CommissionTerms, 'basis' | 'percentage' | 'amount'>): string | null {
  if (terms.basis === CommissionBasis.PERCENT_OF_PROFIT) {
    if (terms.percentage === null) return 'A percentage-of-profit commission needs its percentage.';
    if (terms.amount !== null) return 'A percentage-of-profit commission takes a percentage, not an amount.';
    return null;
  }
  if (terms.amount === null) {
    return terms.basis === CommissionBasis.FLAT_FEE
      ? 'A flat-fee commission needs its amount.'
      : 'A custom commission needs its amount.';
  }
  if (terms.percentage !== null) return 'A flat or custom commission takes an amount, not a percentage.';
  return null;
}

export interface Tally {
  pending: number;
  earned: number;
  paid: number;
  /** Rows whose value could not be known (a share of an unknown profit). */
  unvalued: number;
  count: number;
}

/**
 * Sums a set of commissions by status, in cents. Cancelled rows are counted
 * in nothing — a cancelled commission is not owed, pending or paid.
 */
export function tally(rows: { status: CommissionStatus; value: number | null }[]): Tally {
  const cents = { pending: 0, earned: 0, paid: 0 };
  let unvalued = 0;
  let count = 0;
  for (const row of rows) {
    if (row.status === CommissionStatus.CANCELLED) continue;
    count += 1;
    if (row.value === null) {
      unvalued += 1;
      continue;
    }
    const value = toCents(row.value);
    if (row.status === CommissionStatus.PENDING) cents.pending += value;
    else if (row.status === CommissionStatus.EARNED) cents.earned += value;
    else if (row.status === CommissionStatus.PAID) cents.paid += value;
  }
  return {
    pending: fromCents(cents.pending),
    earned: fromCents(cents.earned),
    paid: fromCents(cents.paid),
    unvalued,
    count,
  };
}
