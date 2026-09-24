import { z } from 'zod';

/**
 * Numeric query and body fields that behave correctly when left blank.
 *
 * `z.coerce.number()` is a trap on anything a form touches: `Number('')` is
 * **0**, so an empty Latitude box arrives as a valid 0 — a real coordinate off
 * the coast of Africa — and an empty reliability rating stores 0 out of 5. Both
 * are worse than a rejection, because nothing downstream can tell them from a
 * deliberate zero.
 *
 * These treat empty string and null as "not provided", so a required field
 * fails with a readable message and an optional one is simply absent.
 */
interface NumberOptions {
  min?: number;
  max?: number;
  int?: boolean;
}

function base(message: string, { min, max, int }: NumberOptions) {
  let schema = z.coerce.number({ error: message });
  if (int) schema = schema.int(message);
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
}

/** An empty value is an error, with `message` explaining what was missing. */
export function requiredNumber(message: string, options: NumberOptions = {}) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    base(message, options),
  );
}

/** An empty value means the field was not supplied. */
export function optionalNumber(message: string, options: NumberOptions = {}) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    base(message, options).optional(),
  );
}

/**
 * Optional, and `null` clears it — for PATCH bodies, where "not sent" and
 * "set this back to empty" are different instructions.
 */
export function nullableNumber(message: string, options: NumberOptions = {}) {
  return z.preprocess(
    (value) => (value === '' ? null : value),
    base(message, options).nullable().optional(),
  );
}

/**
 * An amount of money, in whole currency units with at most two decimals.
 *
 * Money columns are `Decimal(12, 2)`, so a third decimal place is not a more
 * precise amount — it is a value the database will silently round on the way
 * in, leaving whatever the service computed from the request disagreeing with
 * what was actually stored. On a credit ledger that is a balance that does not
 * match its own rows.
 *
 * Refusing it at the edge is the only cheap place: the caller is told to send
 * money, and nothing downstream has to wonder which of two figures is real.
 *
 * Built on `requiredNumber`, so an empty box is still "not provided" rather
 * than `Number('') === 0`.
 *
 * @example amount: money('Enter how much', { min: 0.01, max: 10_000_000 })
 */
export function money(message: string, options: NumberOptions = {}) {
  return requiredNumber(message, options).refine(
    (value) => {
      const fraction = String(value).split('.')[1];
      return fraction === undefined || fraction.length <= 2;
    },
    { message: 'Amounts are in whole cents — at most two decimal places' },
  );
}
