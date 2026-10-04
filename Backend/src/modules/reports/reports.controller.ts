import { Controller, Get, Header, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import { EXPORT_CONTENT_TYPES } from '../../common/export/tabular.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ReportsService } from './reports.service.js';
import { ReportExportDto, ReportRankingDto, ReportSeriesDto, ReportWindowDto } from './dto/reports.dto.js';

const BY_DEPARTURE =
  'Booked and flown trips (BOOKED, CONFIRMED, IN_FLIGHT, COMPLETED) count by the day they depart.';

/**
 * Reports (#23). Every figure is money, so every read needs VIEW_FINANCIALS,
 * and rows are scoped exactly as the trips board is. The export is a file,
 * so it needs EXPORT_DATA as well.
 */
@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'The tiles and the financial summary',
    description: `Revenue, profit, margin, FET charged, averages and trip count over \`from\`–\`to\` (both days included). ${BY_DEPARTURE} \`collected\` is the cash and FET received by payment date in the same window. \`outstanding\` is receivables and payables as they stand today. Averages and margin are null when there is nothing to divide.`,
  })
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportWindowDto) {
    return this.reports.summary(user, query);
  }

  @Get('series')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'Revenue, profit and trips over time',
    description: `One point per bucket — WEEK (the twelve weeks ending with the one containing \`on\`), MONTH (the twelve months of its year) or YEAR (the five years ending with it) — each with its \`start\` day. ${BY_DEPARTURE}`,
  })
  series(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportSeriesDto) {
    return this.reports.series(user, query);
  }

  @Get('brokers')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'Broker performance',
    description: `Revenue, profit, margin and trips per assigned broker over the window, largest revenue first. \`broker\` is null for trips nobody is assigned. ${BY_DEPARTURE}`,
  })
  brokers(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRankingDto) {
    return this.reports.brokers(user, query);
  }

  @Get('clients')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'Top clients by revenue',
    description: `Revenue, profit, margin and trips per client over the window, largest revenue first. ${BY_DEPARTURE}`,
  })
  clients(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRankingDto) {
    return this.reports.clients(user, query);
  }

  @Get('routes')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({
    summary: 'Top routes',
    description: `Trips and revenue per route — the first leg's origin and destination, so a round trip counts as its outbound — over the window, largest revenue first. ${BY_DEPARTURE}`,
  })
  routes(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportRankingDto) {
    return this.reports.routes(user, query);
  }

  @Get('export')
  @RequirePermissions(Permission.VIEW_FINANCIALS, Permission.EXPORT_DATA)
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
