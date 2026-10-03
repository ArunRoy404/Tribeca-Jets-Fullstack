import { DocumentCategory } from '../../generated/prisma/enums.js';

/**
 * Document Vault (#22) rules, as pure functions — the ones a test should be
 * able to walk without a database.
 */

/** Scope §11: "Passport/ID documents require restricted access." */
export const SENSITIVE_CATEGORIES: DocumentCategory[] = [DocumentCategory.PASSPORT, DocumentCategory.ID];

export function isSensitive(category: DocumentCategory): boolean {
  return SENSITIVE_CATEGORIES.includes(category);
}

/**
 * How far ahead "expiring" looks. Ninety days, because a passport inside six
 * months of expiry is already refused by some destinations, and a certificate
 * renewal takes weeks — a window of days would warn after it was too late.
 */
export const EXPIRING_WITHIN_DAYS = 90;

export const ExpiryState = {
  /** No expiry date on file — most documents. */
  NONE: 'NONE',
  VALID: 'VALID',
  EXPIRING: 'EXPIRING',
  EXPIRED: 'EXPIRED',
} as const;
export type ExpiryState = (typeof ExpiryState)[keyof typeof ExpiryState];
export const EXPIRY_STATES = Object.values(ExpiryState) as [ExpiryState, ...ExpiryState[]];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The end of the expiring window: `today` plus the window, midnight UTC. */
export function expiringHorizon(today: Date): Date {
  return new Date(today.getTime() + EXPIRING_WITHIN_DAYS * DAY_MS);
}

/**
 * Where a document's expiry stands against `today` (midnight UTC, the same
 * clock a `@db.Date` is stored on). A document expiring today is still
 * valid today; it is expired from tomorrow.
 */
export function expiryState(expiresOn: Date | null, today: Date): ExpiryState {
  if (!expiresOn) return ExpiryState.NONE;
  if (expiresOn.getTime() < today.getTime()) return ExpiryState.EXPIRED;
  if (expiresOn.getTime() < expiringHorizon(today).getTime()) return ExpiryState.EXPIRING;
  return ExpiryState.VALID;
}

/**
 * The same states as a `where` on `expiresOn` — one rule written twice, one
 * for a row and one for a list, so filtering can never disagree with the
 * badge the row shows. The spec walks both.
 */
export function expiryWhere(state: ExpiryState, today: Date) {
  switch (state) {
    case ExpiryState.NONE:
      return { expiresOn: null };
    case ExpiryState.EXPIRED:
      return { expiresOn: { lt: today } };
    case ExpiryState.EXPIRING:
      return { expiresOn: { gte: today, lt: expiringHorizon(today) } };
    case ExpiryState.VALID:
      return { expiresOn: { gte: expiringHorizon(today) } };
  }
}
