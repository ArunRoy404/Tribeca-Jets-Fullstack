import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { FlightTrackingService } from './flight-tracking.service.js';
import { FlightStatsDto, QueryFlightsDto, UpdateFlightDto } from './dto/flight-tracking.dto.js';

/**
 * Flight Tracking (#14 in scope, #19 in review queue) — manual flight status.
 *
 * Open reads for staff sessions, scoped by reachOf(user.access, Module.TRIPS):
 * a broker sees the flights of their own trips and the unassigned ones, exactly as
 * on the trips board.
 *
 * Writes (reporting on a flight) require @RequireAccess(Module.FLIGHT_TRACKING, Action.EDIT).
 * Staff-only: referral agents are refused (403).
 */
@ApiTags('Flight Tracking')
@Controller('flight-tracking')
@UseGuards(AccessGuard)
@StaffOnly()
export class FlightTrackingController {
  constructor(private readonly flights: FlightTrackingService) {}

  @Get()
  @ApiOperation({
    summary: 'Flights and their reported state',
    description:
      'One row per trip leg, nearest first (most recent first on `window=PAST`). `flightStatus` is null until someone reports — never assumed "not departed". Status, `estimatedArrival` and `trackingUrl` are entered by hand; nothing here comes from a flight-data feed. Cancelled trips are left off unless `status=CANCELLED`.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryFlightsDto) {
    return this.flights.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Board tiles',
    description:
      'Flights reported in the air, reported delayed, departing today, reported landed today, and due out by today with no report at all — under the same trip filters as the list. `on` sets which day counts as today.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: FlightStatsDto) {
    return this.flights.stats(user, query);
  }

  @Get(':legId')
  @ApiOperation({ summary: 'One flight', description: 'Archived legs and trips load too — a timeline links here.' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('legId', ParseUUIDPipe) legId: string) {
    return this.flights.findOne(user, legId);
  }

  @Patch(':legId')
  @RequireAccess(Module.FLIGHT_TRACKING, Action.EDIT)
  @ApiOperation({
    summary: 'Report on a flight',
    description:
      'Sets the status, the arrival estimate or the tracking link — only what is sent. A status change is stamped and written to the audit log with its `note`, which the flight timeline replays. Refused with 400 on a cancelled or archived trip, and when nothing would change.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('legId', ParseUUIDPipe) legId: string,
    @Body() dto: UpdateFlightDto,
  ) {
    return this.flights.update(user, legId, dto);
  }
}
