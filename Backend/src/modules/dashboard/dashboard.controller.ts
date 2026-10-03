import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardActivityDto, DashboardPrioritiesDto, DashboardSummaryDto } from './dto/dashboard.dto.js';

/**
 * Dashboard (#24). VIEW_DASHBOARD admits every staff role; what each section
 * then shows is decided by the owning modules' own read permissions and row
 * scope, so a broker's dashboard counts only a broker's work.
 */
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'The tiles',
    description:
      'Upcoming trips and active requests as they stand now; revenue, FET and gross profit for the trips departing in `period` (the calendar TODAY, WEEK, MONTH or QUARTER containing `on`, or YEAR to date) against the window before it; receivables, operator payments and empty legs as they stand. A section the caller may not read is absent.',
  })
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: DashboardSummaryDto) {
    return this.dashboard.summary(user, query);
  }

  @Get('priorities')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  @ApiOperation({
    summary: "Today's priorities",
    description:
      'Client follow-ups due by today, your own tasks due by today, client invoices and operator bills still owed that are overdue or due within three days, and documents expired or expiring within 30 days — most overdue first. Each carries `state`: OVERDUE, DUE_TODAY or DUE_SOON.',
  })
  priorities(@CurrentUser() user: AuthenticatedUser, @Query() query: DashboardPrioritiesDto) {
    return this.dashboard.priorities(user, query);
  }

  @Get('activity')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Recent activity',
    description:
      "The audit trail, newest first: everybody's activity on the kinds of record you can see all of, and your own on the rest. Each entry names its record by `subject.label`; sign-ins are never listed.",
  })
  activity(@CurrentUser() user: AuthenticatedUser, @Query() query: DashboardActivityDto) {
    return this.dashboard.activity(user, query);
  }
}
