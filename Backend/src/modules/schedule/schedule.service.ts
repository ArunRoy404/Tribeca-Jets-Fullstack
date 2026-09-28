import { Injectable } from '@nestjs/common';
import { paginate, type AuthenticatedUser, type Paginated } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { Permission, Scope, scopeFor } from '../../common/authorization/permissions.js';
import { todayUtc } from '../../common/money/settlement.js';
import { TripsService, type ScheduleFilter, type ScheduleLegRow } from '../trips/trips.service.js';
import { tripPayment } from '../receivables/receivables.amounts.js';
import { itineraryTimes, statWindows, yearCalendar, yearWindow } from './schedule.calendar.js';
import type { QueryScheduleInput, ScheduleCalendarInput, ScheduleStatsInput } from './dto/schedule.dto.js';

/**
 * Schedule (#13) — a read-only calendar of trip legs.
 *
 * No table of its own: every row is a `TripLeg` read through `TripsService`,
 * under the trip scope, and every fact on it — client, aircraft, operator,
 * broker, status — is the trip's own, read on every request. Rescheduling or
 * changing a status happens on the trip; this module only shows it.
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly trips: TripsService) {}

  private filter(query: ScheduleFilter): ScheduleFilter {
    const { status, type, assignedBrokerId, operatorId, aircraftId, search } = query;
    return { status, type, assignedBrokerId, operatorId, aircraftId, search };
  }

  async findAll(user: AuthenticatedUser, query: QueryScheduleInput): Promise<Paginated<unknown>> {
    const { rows, total } = await this.trips.scheduleLegs(
      user,
      this.filter(query),
      query.from,
      query.to,
      toPrismaPagination(query),
    );
    const receivables = scopeFor(user.role, Permission.VIEW_RECEIVABLES) !== Scope.NONE;
    return paginate(
      rows.map((row) => this.serialise(row, receivables)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * One leg as the calendar shows it. Arrival and flight time come only from
   * the trip's itinerary, and only for the outbound leg; the payment state
   * only for a role that may read receivables — absent otherwise, never a
   * guess.
   */
  private serialise(row: ScheduleLegRow, receivables: boolean) {
    const { trip, ...leg } = row;
    const { invoices, _count, itinerary, fetRate, ...facts } = trip;
    return {
      ...leg,
      legCount: _count.legs,
      ...itineraryTimes(leg.sequence, itinerary),
      trip: {
        ...facts,
        fetRate: Number(fetRate),
        operatorConfirmed: facts.operatorConfirmedAt !== null,
        itinerary: itinerary && !itinerary.deletedAt ? { id: itinerary.id, status: itinerary.status } : null,
        clientPayment: receivables ? tripPayment(invoices) : undefined,
      },
    };
  }

  stats(user: AuthenticatedUser, query: ScheduleStatsInput) {
    return this.trips.scheduleStats(user, this.filter(query), statWindows(query.on ?? todayUtc()));
  }

  async calendar(user: AuthenticatedUser, query: ScheduleCalendarInput) {
    const { from, to } = yearWindow(query.year);
    const counts = await this.trips.scheduleCountsByDay(user, this.filter(query), from, to);
    return yearCalendar(query.year, counts);
  }
}
