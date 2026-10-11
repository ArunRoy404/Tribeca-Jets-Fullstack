import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ScheduleService } from './schedule.service.js';
import { QueryScheduleDto, ScheduleCalendarDto, ScheduleStatsDto } from './dto/schedule.dto.js';

/**
 * Schedule (#13 in scope, #18 in review queue) — the calendar of trip legs, read-only.
 *
 * Open reads for staff sessions, scoped by reachOf(user.access, Module.TRIPS):
 * a broker sees the legs of their own trips and the unassigned ones, exactly as
 * on the trips board. There are no writes — a leg is moved, and a trip's status
 * changed, on the trip. Staff-only: referral agents are refused (403).
 */
@ApiTags('Schedule')
@Controller('schedule')
@UseGuards(AccessGuard)
@StaffOnly()
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get()
  @ApiOperation({
    summary: 'Legs departing in a window',
    description:
      'One row per trip leg whose departure day is in [from, to] (at most 42 days), in the order they fly: by day, then time, untimed last. Cancelled trips are left off unless `status=CANCELLED`. `arrivalTime` and `flightTime` come from the trip\'s itinerary and only for the outbound leg — null otherwise. `trip.clientPayment` is absent for a role that may not read receivables.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryScheduleDto) {
    return this.schedule.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Calendar tiles',
    description:
      'Legs departing today, legs departing in the next seven days (tomorrow onward), legs today whose trip is completed, and trips in flight — under the same filters as the list. `on` sets which day counts as today.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: ScheduleStatsDto) {
    return this.schedule.stats(user, query);
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Legs counted per day for a year',
    description:
      'The year view: a count per month and a count per day that has any, under the same filters as the list. Counts only — open a day with the list.',
  })
  calendar(@CurrentUser() user: AuthenticatedUser, @Query() query: ScheduleCalendarDto) {
    return this.schedule.calendar(user, query);
  }
}
