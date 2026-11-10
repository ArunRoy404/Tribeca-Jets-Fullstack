import { TripApprovalStatus, TripStatus } from '../../generated/prisma/enums.js';

/**
 * Trip approval (client feedback 2.1, 9 Nov 2026) as pure functions, beside
 * the lifecycle in `trips.lifecycle.ts` — a gate on a status machine is only
 * tested if it can be called without a database.
 *
 * A trip created by someone without `TRIPS · APPROVE` starts PENDING and
 * cannot be confirmed until someone who holds it approves. A declined trip
 * is held the same way; editing it sends it back for approval.
 */

/** What a new trip starts as: approved when its creator could approve it. */
export function initialApproval(mayApprove: boolean): TripApprovalStatus {
  return mayApprove ? TripApprovalStatus.APPROVED : TripApprovalStatus.PENDING;
}

/** Why a trip in this approval state may not be confirmed, or null when it may. */
export function confirmBlockedBy(approval: TripApprovalStatus): string | null {
  if (approval === TripApprovalStatus.PENDING) {
    return 'This trip is waiting for approval and cannot be confirmed until it is approved.';
  }
  if (approval === TripApprovalStatus.REJECTED) {
    return 'This trip was declined. Edit it to send it back for approval, then confirm it once it is approved.';
  }
  return null;
}

/**
 * Why a trip may not be *created* in this status, or null when it may.
 * Creating a trip as CONFIRMED is the same move as confirming it, so it is
 * refused to anyone whose trip would start PENDING.
 */
export function createBlockedBy(status: TripStatus, mayApprove: boolean): string | null {
  if (status === TripStatus.CONFIRMED && !mayApprove) {
    return 'A trip you create needs approval before it can be confirmed. Create it as Booked instead.';
  }
  return null;
}

/** Why the trip cannot be approved, or null when it can. */
export function approveBlockedBy(approval: TripApprovalStatus): string | null {
  return approval === TripApprovalStatus.APPROVED ? 'This trip is already approved.' : null;
}

/**
 * Why the trip cannot be declined, or null when it can. Only a trip waiting
 * for a decision is declined — an approved trip may already be confirmed or
 * in the air, and "declining" it would contradict its status.
 */
export function rejectBlockedBy(approval: TripApprovalStatus): string | null {
  if (approval === TripApprovalStatus.APPROVED) return 'This trip is already approved, so it cannot be declined.';
  if (approval === TripApprovalStatus.REJECTED) return 'This trip has already been declined.';
  return null;
}

/**
 * The trip-confirmation checklist ticks. Ticking one records progress on the
 * trip; it is not an edit to what was declined, so it does not resubmit it.
 */
const CHECKLIST_FIELDS = new Set([
  'operatorConfirmed',
  'contractSent',
  'contractReceived',
  'operatorPaymentReceived',
]);

/**
 * Whether this edit sends a declined trip back for approval: the trip was
 * declined, the editor cannot approve it themselves, and the edit changes
 * more than the checklist.
 */
export function resubmits(
  approval: TripApprovalStatus,
  mayApprove: boolean,
  editedFields: string[],
): boolean {
  if (approval !== TripApprovalStatus.REJECTED || mayApprove) return false;
  return editedFields.some((field) => !CHECKLIST_FIELDS.has(field));
}
