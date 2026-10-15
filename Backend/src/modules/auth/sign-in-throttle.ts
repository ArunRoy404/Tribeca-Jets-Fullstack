import { FailedSignInScope } from '../../generated/prisma/enums.js';

/**
 * The rules behind Settings › Rate Limiting, as pure functions so they are
 * tested without Redis (owner's decision, 15 Oct 2026):
 *
 * - **Only failures count.** A wrong password adds one; a correct one is
 *   never limited and clears the count. Switching between five accounts in
 *   five minutes used to pause sign-in, because every sign-in counted.
 * - **A pause refuses every attempt, right password included.** If a right
 *   password got through a pause, the one attempt that was *not* refused
 *   would tell a guesser which password was right, and the pause would stop
 *   nothing.
 * - **A null limit is "Never"** — nothing is counted or paused.
 */

/** Who is trying: the email typed (lower-cased by the DTO) and the network. */
export interface SignInSubject {
  email: string;
  ip: string | null;
}

/**
 * The Redis key that one subject's failures are counted under. Changing the
 * scope setting starts every count afresh — the old keys simply expire.
 */
export function subjectKey(scope: FailedSignInScope, subject: SignInSubject): string {
  const ip = subject.ip ?? 'unknown';
  switch (scope) {
    case FailedSignInScope.ACCOUNT:
      return `account:${subject.email}`;
    case FailedSignInScope.IP:
      return `ip:${ip}`;
    case FailedSignInScope.ACCOUNT_AND_IP:
    default:
      return `account:${subject.email}|ip:${ip}`;
  }
}

/** "14 minutes", "1 minute", "less than a minute", "24 hours". */
export function waitPhrase(seconds: number): string {
  if (seconds < 60) return 'less than a minute';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 120) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hours`;
}

/** The refusal while sign-in is paused. Says how long, so it never reads as a fault. */
export function pausedMessage(seconds: number): string {
  return `Too many failed sign-in attempts. Please try again in ${waitPhrase(seconds)}.`;
}

/** The refusal once too many codes have been asked for. */
export function codesMessage(seconds: number): string {
  return `Too many codes have been requested for this account. Please try again in ${waitPhrase(seconds)}.`;
}

/**
 * The wrong-password message. It warns only when two or fewer attempts are
 * left, and reads the same whether or not the email has an account (an
 * unknown email is counted too), so it gives nothing away about who exists.
 */
export function invalidMessage(remaining: number | null, lockoutMinutes: number): string {
  const base = 'Invalid email or password.';
  if (remaining === null || remaining > 2) return base;
  return `${base} ${remaining} more failed attempt${remaining === 1 ? '' : 's'} will pause sign-in for ${waitPhrase(lockoutMinutes * 60)}.`;
}
