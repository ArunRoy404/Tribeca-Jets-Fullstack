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
