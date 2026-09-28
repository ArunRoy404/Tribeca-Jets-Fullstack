import { Injectable } from '@nestjs/common';
import { paginate, type AuthenticatedUser, type Paginated } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { Permission, Scope, scopeFor } from '../../common/authorization/permissions.js';
import { todayUtc } from '../../common/money/settlement.js';
import { TripsService, type ScheduleFilter } from '../trips/trips.service.js';
import { serialiseLeg } from '../trips/trips.legs.js';
import type { FlightStatsInput, QueryFlightsInput, UpdateFlightInput } from './dto/flight-tracking.dto.js';

/**
 * Flight Tracking (#14) — every flight (a trip leg) and what the desk has
 * heard about it.
 *
 * **Manual by decision** (27 Sep 2026): there is no flight-data provider. A
 * broker reports the status, the operator's arrival estimate and a public
 * tracking link by hand; each report is written to the audit log, and the
 * flight's timeline (notes, subject FLIGHT) replays them beside the notes
 * written about it. The leg and its trip stay the owners — every read and
 * write goes through `TripsService` under the trip scope.
 */
@Injectable()
export class FlightTrackingService {
  constructor(private readonly trips: TripsService) {}

  private filter(query: FlightStatsInput): ScheduleFilter {
    const { status, type, assignedBrokerId, operatorId, aircraftId, search } = query;
    return { status, type, assignedBrokerId, operatorId, aircraftId, search };
  }

  private receivables(user: AuthenticatedUser): boolean {
    return scopeFor(user.role, Permission.VIEW_RECEIVABLES) !== Scope.NONE;
  }

  async findAll(user: AuthenticatedUser, query: QueryFlightsInput): Promise<Paginated<unknown>> {
    const { rows, total } = await this.trips.flights(
      user,
      {
        ...this.filter(query),
        window: query.window,
        flightStatus: query.flightStatus,
        today: query.on ?? todayUtc(),
      },
      toPrismaPagination(query),
    );
    const receivables = this.receivables(user);
    return paginate(
      rows.map((row) => serialiseLeg(row, receivables)),
      total,
      query.page,
      query.limit,
    );
  }

  stats(user: AuthenticatedUser, query: FlightStatsInput) {
    return this.trips.flightStats(user, { ...this.filter(query), today: query.on ?? todayUtc() });
  }

  async findOne(user: AuthenticatedUser, legId: string) {
    return serialiseLeg(await this.trips.flight(user, legId), this.receivables(user));
  }

  async update(user: AuthenticatedUser, legId: string, dto: UpdateFlightInput) {
    return serialiseLeg(await this.trips.updateFlight(user, legId, dto), this.receivables(user));
  }
}
