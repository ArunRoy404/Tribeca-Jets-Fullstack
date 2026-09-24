import { CreditEntryType } from '../../generated/prisma/enums.js';

/**
 * The arithmetic of a credit ledger, as pure functions.
 *
 * Pulled out of the service for the same reason the uploads access rule and
 * the timeline merge were: this is the part that is *wrong quietly*. A balance
 * that is off by a cent, or that lets an application overdraw an account,
 * looks exactly like a balance that is right until somebody reconciles it
 * against a bank statement.
 *
 * **Everything here is integer cents.** Money is never added as a JavaScript
 * number: `0.1 + 0.2` is `0.30000000000000004`, and a ledger is nothing but
 * repeated addition. The column is `Decimal(12, 2)`, so every value fits a
 * safe integer once multiplied out, and the conversion happens once at each
 * edge rather than being re-decided per call site.
 */

/** What a summed ledger looks like once the reading is done. */
export interface CreditSummary {
  /** Everything ever placed on account, in whole currency. */
  credited: number;
  /** Everything ever taken off it. */
  applied: number;
  /** What the client actually has with us: credited − applied. */
  balance: number;
}

/**
 * A `Decimal`, a decimal string or a number, as integer cents.
 *
 * Prisma hands back `Decimal`, which serialises as a string; a DTO hands over
 * a number. Both describe the same money and must convert identically.
 *
 * **Parsed from the text, not multiplied.** `1.005 * 100` is
 * `100.49999999999999`, so the precision is gone *before* any rounding gets a
 * chance — `Math.round` then returns 100 and the ledger is a cent light, on an
 * input the API had already accepted. Shifting the decimal point in the string
 * cannot lose anything, because the string is exact by construction.
 *
 * A third decimal place is rounded half-up, matching what the `Decimal(12, 2)`
 * column would store. The DTO refuses one before it reaches here; this is the
 * backstop for the rows already in the database and for any future caller that
 * bypasses the DTO.
 */
export function toCents(
  value: { toString(): string } | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;

  const text = typeof value === 'number' ? String(value) : value.toString();
  // Scientific notation defeats string parsing; nothing in a money column
  // produces it, but a hand-built number can.
  if (!/^-?\d*(\.\d+)?$/.test(text.trim())) {
    const asNumber = Number(text);
    return Number.isFinite(asNumber) ? Math.round(asNumber * 100) : 0;
  }

  const negative = text.trim().startsWith('-');
  const [whole, fraction = ''] = text.trim().replace('-', '').split('.');
  const cents =
    Number(whole || '0') * 100 + Number((fraction + '00').slice(0, 2));
  // Round half-up on the third decimal, as the column would.
  const rounded = Number(fraction[2] ?? '0') >= 5 ? cents + 1 : cents;
  return negative ? -rounded : rounded;
}

/** Integer cents back to the whole currency the API speaks in. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * The balance, from the two sums the database returns.
 *
 * Kept as its own function rather than inlined because it is the one line that
 * decides which direction each entry type moves the money, and that decision
 * must be made in exactly one place — a second copy in the overdraw check
 * would be the copy that disagrees.
 */
export function summarise(creditedCents: number, appliedCents: number): CreditSummary {
  return {
    credited: fromCents(creditedCents),
    applied: fromCents(appliedCents),
    balance: fromCents(creditedCents - appliedCents),
  };
}

/** How a single entry moves the balance: `+1` for a credit, `-1` for a use. */
export function directionOf(type: CreditEntryType): 1 | -1 {
  return type === CreditEntryType.CREDIT ? 1 : -1;
}

/**
 * The balance in cents after `entry` is added to a ledger currently standing
 * at `balanceCents`.
 */
export function balanceAfter(
  balanceCents: number,
  entry: { type: CreditEntryType; amountCents: number },
): number {
  return balanceCents + directionOf(entry.type) * entry.amountCents;
}

/**
 * Whether an entry would take the account below zero.
 *
 * A client cannot spend money they do not have on account, and an application
 * that overdraws is a typo — a extra zero, or the same cancellation entered
 * twice. Catching it at the write is the only place it is cheap: once it is a
 * row, the balance on the profile is wrong and nothing says which entry is the
 * mistaken one.
 *
 * Zero is fine; it means the credit is exactly used up.
 */
export function overdraws(
  balanceCents: number,
  entry: { type: CreditEntryType; amountCents: number },
): boolean {
  return balanceAfter(balanceCents, entry) < 0;
}
