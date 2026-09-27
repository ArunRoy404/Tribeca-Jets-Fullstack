import { EmptyLegStatus } from '../../generated/prisma/enums.js';

/**
 * Client adjustment #10b — "when we have empty legs that can match a previous
 * trip request, we can still contact that client" — as pure functions.
 *
 * **The rule.** A trip request matches an empty leg when it asked for the
 * same route: the same departure airport and the same arrival airport. Every
 * request counts, whatever became of it — LOST, CONVERTED, archived — because
 * the whole point is to reach people whose enquiry went nowhere at the time.
 * A request whose requested day falls within `DATE_WINDOW_DAYS` of the leg's
 * departure is a *date match* as well, and those are listed first: that
 * client wanted to fly that route that week.
 *
 * Deliberately exact on airports. "Teterboro" and "Newark" serve the same
 * city, but whether a client would take one for the other is the broker's
 * call on the phone, not something to guess at here — a match list padded
 * with near misses is one nobody reads.
 */

/** Either side of the leg's departure day that still counts as the same trip. */
export const DATE_WINDOW_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two calendar dates (both stored at midnight UTC). */
export function dayGap(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / DAY_MS);
}

export interface MatchableLeg {
  originAirportId: string;
  destinationAirportId: string;
  departureDate: Date;
}

export interface MatchableRequest {
  id: string;
  originAirportId: string | null;
  destinationAirportId: string | null;
  departureDate: Date | null;
  createdAt: Date;
}

export interface Match<R> {
  request: R;
  /** Days between the request's day and the leg's, or null when it named none. */
  dayGap: number | null;
  /** Within the window — the client wanted this route this week. */
  dateMatch: boolean;
}

export function sameRoute(leg: MatchableLeg, request: MatchableRequest): boolean {
  return (
    request.originAirportId === leg.originAirportId &&
    request.destinationAirportId === leg.destinationAirportId
  );
}

/**
 * The requests that match `leg`, best first: date matches by closeness, then
 * everything else on the route, newest enquiry first. Ties settle on the id,
 * so the order is the same on every read.
 */
export function matchesFor<R extends MatchableRequest>(
  leg: MatchableLeg,
  requests: readonly R[],
): Match<R>[] {
  const matches = requests
    .filter((request) => sameRoute(leg, request))
    .map((request) => {
      const gap = request.departureDate ? dayGap(request.departureDate, leg.departureDate) : null;
      return { request, dayGap: gap, dateMatch: gap !== null && gap <= DATE_WINDOW_DAYS };
    });

  return matches.sort((a, b) => {
    if (a.dateMatch !== b.dateMatch) return a.dateMatch ? -1 : 1;
    if (a.dateMatch && b.dateMatch && a.dayGap !== b.dayGap) return a.dayGap! - b.dayGap!;
    const byNewest = b.request.createdAt.getTime() - a.request.createdAt.getTime();
    if (byNewest !== 0) return byNewest;
    return a.request.id < b.request.id ? -1 : a.request.id > b.request.id ? 1 : 0;
  });
}

/** The two counts the board shows per leg. */
export function matchCounts(leg: MatchableLeg, requests: readonly MatchableRequest[]) {
  const matches = matchesFor(leg, requests);
  return {
    matchCount: matches.length,
    dateMatchCount: matches.filter((match) => match.dateMatch).length,
  };
}

/** Still on offer: nobody has booked it and nobody has closed it. */
export const OPEN_STATUSES = [EmptyLegStatus.AVAILABLE, EmptyLegStatus.MATCHED] as const;

/**
 * The status as the desk should read it. An open leg whose offer has lapsed
 * *is* expired, whether or not anyone has clicked Expire — computed on read
 * rather than written by a job, so it is right the moment the clock passes.
 */
export function effectiveStatus(
  status: EmptyLegStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): EmptyLegStatus {
  const open = (OPEN_STATUSES as readonly EmptyLegStatus[]).includes(status);
  if (open && expiresAt !== null && expiresAt.getTime() <= now.getTime()) {
    return EmptyLegStatus.EXPIRED;
  }
  return status;
}
