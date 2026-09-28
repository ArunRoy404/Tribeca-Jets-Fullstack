import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ScheduleService } from './schedule.service.js';
import { QueryScheduleDto, ScheduleCalendarDto, ScheduleStatsDto } from './dto/schedule.dto.js';

/**
 * Schedule (#13) — the calendar of trip legs, read-only.
 *
 * VIEW_TRIPS, at the trip scope: a broker sees the legs of their own trips and
 * the unassigned ones, exactly as on the trips board. There are no writes —
 * a leg is moved, and a trip's status changed, on the trip.
 */
@ApiTags('Schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Legs departing in a window',
    description:
      'One row per trip leg whose departure day is in [from, to] (at most 42 days), in the order they fly: by day, then time, untimed last. Cancelled trips are left off unless `status=CANCELLED`. `arrivalTime` and `flightTime` come from the trip\'s itinerary and only for the outbound leg — null otherwise. `trip.clientPayment` is absent for a role that may not read receivables.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryScheduleDto) {
    return this.schedule.findAll(user, query);
  }

  @Get('stats')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Calendar tiles',
    description:
      'Legs departing today, legs departing in the next seven days (tomorrow onward), legs today whose trip is completed, and trips in flight — under the same filters as the list. `on` sets which day counts as today.',
  })
  stats(@CurrentUser() user: AuthenticatedUser, @Query() query: ScheduleStatsDto) {
    return this.schedule.stats(user, query);
  }

  @Get('calendar')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Legs counted per day for a year',
    description:
      'The year view: a count per month and a count per day that has any, under the same filters as the list. Counts only — open a day with the list.',
  })
  calendar(@CurrentUser() user: AuthenticatedUser, @Query() query: ScheduleCalendarDto) {
    return this.schedule.calendar(user, query);
  }
}
