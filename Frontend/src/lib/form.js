/**
 * Turning a form's strings into the API's payload.
 *
 * Every create/edit form in the product makes the same two decisions about an
 * optional field, and they are shared here because seven forms had each
 * written their own copy — and three of them got the second decision wrong.
 *
 * 1. **A blank box is never a value.** `Number("")` is 0, so an untouched
 *    Range field would store a real, wrong number; `""` is not a date.
 * 2. **Blank means something different on create and on edit.** On create an
 *    untouched field is simply omitted. On edit it must be sent as `null`,
 *    because the API reads an omitted field as "leave it alone" — so a form
 *    that omits a cleared field silently keeps the old value. That is how
 *    emptying a client's phone number, removing a quote's aircraft photo or
 *    deleting its terms all appeared to save and changed nothing.
 *
 * Pass `{ editing: true }` from an edit form. The option is per call rather
 * than per module on purpose: a create-only field inside an edit form (a
 * version note, say) stays omit-when-blank.
 */

/** Trimmed text, or the blank for this verb: omitted on create, null on edit. */
export function optionalText(value, { editing = false } = {}) {
  const trimmed = String(value ?? "").trim();
  if (trimmed) return trimmed;
  return editing ? null : undefined;
}

/**
 * A number, or the blank for this verb.
 *
 * Something that does not parse is omitted rather than sent, so the API's own
 * validation never sees `NaN`; the form's `type="number"` input is the first
 * line of defence against it.
 */
export function optionalNumber(value, { editing = false } = {}) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return editing ? null : undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}
