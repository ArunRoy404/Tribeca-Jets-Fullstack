import { TripStatus } from '../../generated/prisma/enums.js';

/**
 * Where a trip may move next, and which trips may still be edited — as pure
 * functions, because a status machine only ever exercised by clicking through
 * a screen is one nobody has tested.
 *
 * The forward path is the charter itself: DRAFT → BOOKED → CONFIRMED →
 * IN_FLIGHT → COMPLETED. Every step can be undone one step back, because the
 * desk mis-clicks and a status that cannot be corrected gets worked around in
 * the notes instead. CANCELLED is reachable from anywhere before the aircraft
 * leaves, and a cancelled trip can be reopened as a DRAFT.
 */
const TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  [TripStatus.DRAFT]: [TripStatus.BOOKED, TripStatus.CANCELLED],
  [TripStatus.BOOKED]: [TripStatus.CONFIRMED, TripStatus.DRAFT, TripStatus.CANCELLED],
  [TripStatus.CONFIRMED]: [TripStatus.IN_FLIGHT, TripStatus.BOOKED, TripStatus.CANCELLED],
  // Once wheels are up it cannot be "cancelled" — only landed, or put back
  // if the departure was marked by mistake.
  [TripStatus.IN_FLIGHT]: [TripStatus.COMPLETED, TripStatus.CONFIRMED],
  [TripStatus.COMPLETED]: [TripStatus.IN_FLIGHT],
  [TripStatus.CANCELLED]: [TripStatus.DRAFT],
};

export function allowedNextStatuses(from: TripStatus): readonly TripStatus[] {
  return TRANSITIONS[from];
}

export function canMove(from: TripStatus, to: TripStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * The statuses a trip may be *created* in. IN_FLIGHT and COMPLETED are things
 * that happen to a trip, not things it starts as; CANCELLED would be a trip
 * that never was.
 */
export const CREATABLE_STATUSES = [
  TripStatus.DRAFT,
  TripStatus.BOOKED,
  TripStatus.CONFIRMED,
] as const;

/**
 * A finished or cancelled trip is history, and its details are not edited in
 * place — reopen it (one step back) first, which leaves a trail.
 */
export function isEditable(status: TripStatus): boolean {
  return status !== TripStatus.COMPLETED && status !== TripStatus.CANCELLED;
}

/** Still ahead of the desk: counts towards "active" everywhere. */
export const ACTIVE_STATUSES = [
  TripStatus.DRAFT,
  TripStatus.BOOKED,
  TripStatus.CONFIRMED,
  TripStatus.IN_FLIGHT,
] as const;

/** Revenue that counts: anything booked and not cancelled. */
export const REVENUE_STATUSES = [
  TripStatus.BOOKED,
  TripStatus.CONFIRMED,
  TripStatus.IN_FLIGHT,
  TripStatus.COMPLETED,
] as const;

export type LegShape = {
  originAirportId: string;
  destinationAirportId: string;
  departureDate?: Date | null;
};

/**
 * The legs a trip type allows, as a message or null when they fit.
 *
 * A one-way trip is one leg and a round trip two; a multi-leg trip is at least
 * two. No leg may start and end at the same airport, and the days must not go
 * backwards — a return before the outbound is a typo, caught on the field.
 */
export function legProblem(type: 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_LEG', legs: LegShape[]): string | null {
  if (type === 'ONE_WAY' && legs.length !== 1) return 'A one-way trip has exactly one leg';
  if (type === 'ROUND_TRIP' && legs.length !== 2) return 'A round trip has exactly two legs';
  if (type === 'MULTI_LEG' && legs.length < 2) return 'A multi-leg trip needs at least two legs';

  for (const [index, leg] of legs.entries()) {
    if (leg.originAirportId === leg.destinationAirportId) {
      return `Leg ${index + 1} starts and ends at the same airport`;
    }
  }

  let previous: number | null = null;
  for (const [index, leg] of legs.entries()) {
    if (!leg.departureDate) continue;
    const day = leg.departureDate.getTime();
    if (previous !== null && day < previous) {
      return `Leg ${index + 1} departs before the leg ahead of it`;
    }
    previous = day;
  }
  return null;
}
