/**
 * Money as integer cents — the one conversion every money feature shares.
 *
 * Lifted out of the client-credit ledger when Empty Legs and Commissions
 * became its second and third callers (AGENTS.md, "extract on the second
 * copy"). The ledger re-exports both, so its callers did not move.
 */

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
