const DASH = "—";

/**
 * Money formatting, in one place.
 *
 * This lived in `lib/lead.js` and was imported from there by `lib/quote.js`
 * and `lib/sourcing.js` — three modules reaching into a fourth's file for a
 * function that was never about leads. `lead.js` now re-exports from here, so
 * no existing caller changed.
 */

/**
 * Whole currency, no decimals — the desk quotes in round numbers.
 *
 * Right for a quote, a budget or a pipeline total, all of which are negotiated
 * in thousands. **Wrong for a ledger**: see `formatMoneyExact`.
 */
export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return DASH;
  const number = Number(value);
  if (!Number.isFinite(number)) return DASH;
  return number.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * To the cent, always — for money that has to reconcile.
 *
 * A credit balance is not a negotiated figure, it is an amount somebody is
 * owed, and rounding $6,000.40 to "$6,000" on screen means the profile and the
 * bank statement disagree by forty cents with nothing explaining why. The
 * ledger's own arithmetic is exact to the cent on the server; displaying it
 * any other way throws that away at the last step.
 */
export function formatMoneyExact(value) {
  if (value === null || value === undefined || value === "") return DASH;
  const number = Number(value);
  if (!Number.isFinite(number)) return DASH;
  return number.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
