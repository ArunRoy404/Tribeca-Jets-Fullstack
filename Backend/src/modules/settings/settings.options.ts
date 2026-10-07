/**
 * The values each Settings choice may take.
 *
 * Paired with the option lists in the frontend's `lib/settings.js` — change
 * one and change the other. A value outside them is refused (400) rather than
 * stored, because a select cannot show a value it has no option for: it would
 * render the raw number, and the next save would post it back unchanged.
 */
export const QUOTE_VALIDITY_HOURS = [12, 24, 48, 72, 168] as const;
export const FOLLOW_UP_INTERVAL_DAYS = [1, 2, 3, 5, 7] as const;
export const IDLE_TIMEOUT_MINUTES = [5, 10, 15, 30, 60] as const;
export const IDLE_WARNING_MINUTES = [1, 2, 5] as const;
export const QUOTE_EXPIRY_WARNING_HOURS = [1, 2, 4, 12, 24] as const;
export const PAYMENT_REMINDER_DAYS = [0, 1, 3, 7] as const;
export const FOLLOW_UP_REMINDER_MINUTES = [0, 15, 60, 1440] as const;
