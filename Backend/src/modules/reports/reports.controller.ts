import { Controller, Get, Header, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { Action, Module } from '../../common/authorization/access.js';
import { EXPORT_CONTENT_TYPES } from '../../common/export/tabular.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ReportsService } from './reports.service.js';
import { ReportExportDto, ReportRankingDto, ReportSeriesDto, ReportWindowDto } from './dto/reports.dto.js';

const BY_DEPARTURE =
  'Booked and flown trips (BOOKED, CONFIRMED, IN_FLIGHT, COMPLETED) count by the day they depart.';

/**
 * Reports (#23 / #29). Every figure is money: readings require
 * REPORTS · VIEW, and operations export requires REPORTS · EXPORT. Outside
 * partners (referral agents) are barred entirely with @StaffOnly().
 */
@ApiTags('Reports')
@StaffOnly()
@UseGuards(AccessGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @RequireAccess(Module.REPORTS, Action.VIEW)
  @ApiOperation({
    summary: 'The tiles and the financial summary',
    description: `Revenue, profit, margin, FET charged, averages and trip count over \`from\`–\`to\` (both days included). ${BY_DEPARTURE} \`collected\` is the cash and FET received by payment date in the same window. \`outstanding\` is receivables and payables as they stand today. Averages and margin are null when there is nothing to divide.`,
  })
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportWindowDto) {
    return this.reports.summary(user, query);
  }

  @Get('series')
  @RequireAccess(Module.REPORTS, Action.VIEW)
  @ApiOperation({
    summary: 'Revenue, profit and trips over time',
    description: `One point per bucket — WEEK (the twelve weeks ending with the one containing \`on\`), MONTH (the twelve months of its year) or YEAR (the five years ending with it) — each with its \`start\` day. ${BY_DEPARTURE}`,
  })
  series(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportSeriesDto) {
    return this.reports.series(user, query);
  }

  @Get('brokers')
  @RequireAccess(Module.REPORTS, Action.VIEW)
  @ApiOperation({
    summary: 'Broker performance',
    description: `Revenue, profit, margin and trips per assigned broker over the window, largest revenue first. \`broker\` is null for trips nobody is assigned. ${BY_DEPARTURE}`,
  })
  brokers(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRankingDto) {
    return this.reports.brokers(user, query);
  }

  @Get('clients')
  @RequireAccess(Module.REPORTS, Action.VIEW)
  @ApiOperation({
    summary: 'Top clients by revenue',
    description: `Revenue, profit, margin and trips per client over the window, largest revenue first. ${BY_DEPARTURE}`,
  })
  clients(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRankingDto) {
    return this.reports.clients(user, query);
  }

  @Get('routes')
  @RequireAccess(Module.REPORTS, Action.VIEW)
  @ApiOperation({
    summary: 'Top routes',
    description: `Trips and revenue per route — the first leg's origin and destination, so a round trip counts as its outbound — over the window, largest revenue first. ${BY_DEPARTURE}`,
  })
  routes(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRankingDto) {
    return this.reports.routes(user, query);
  }

  @Get('export')
  @RequireAccess(Module.REPORTS, Action.EXPORT)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces(EXPORT_CONTENT_TYPES.CSV, EXPORT_CONTENT_TYPES.XLSX)
  @ApiOperation({
    summary: 'Export operations',
    description: `One row per trip — reference, departure, status, client, broker, route, aircraft, operator, revenue, FET, operator cost, profit and margin — as CSV or XLSX, always downloaded. Over \`from\`–\`to\`, or every operation on record when both are omitted. ${BY_DEPARTURE} An unknown figure is an empty cell, never zero.`,
  })
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportExportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reports.export(user, query);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.body.length));
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return new StreamableFile(file.body);
  }
}
