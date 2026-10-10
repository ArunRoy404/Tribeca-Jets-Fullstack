import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  RequireAccess,
  StaffOnly,
} from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.catalogue.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { TripsService } from './trips.service.js';
import {
  BookQuoteDto,
  ChangeTripStatusDto,
  CreateTripDto,
  QueryTripsDto,
  UpdateTripDto,
} from './dto/trip.dto.js';

/**
 * Trips (#11 in build order / #16 in review order) — the booked flight (scope §6.5).
 *
 * Uses per-user permissions (Module.TRIPS):
 * - @StaffOnly() on controller blocks outside referral partners (portal only).
 * - Reads (findAll, stats, findOne): open to any signed-in staff session.
 * - Financials (operatorCost, profit, margins, stats totals): gated behind VIEW_MONEY.
 * - Writes: guarded via @RequireAccess(Module.TRIPS, Action.CREATE / EDIT / ARCHIVE).
 * - Scoping: reachOf(user.access, Module.TRIPS) filters broker queries to own/assigned rows.
 */
@ApiTags('Trips')
@StaffOnly()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @ApiOperation({
    summary: 'List trips',
    description:
      'Scoped like trip requests: a broker sees their own and unassigned trips. Filters: status, type, client, broker, operator, aircraft, `departure` (PAST / TODAY / UPCOMING on the first leg), `activeOnly`. Search matches the reference ("TJ-1048" or "1048"), client, tail, model and operator. Money is computed on every read; operator cost, profit and margin are absent without VIEW_MONEY.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTripsDto) {
    return this.trips.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order. */
  @Get('stats')
  @ApiOperation({
    summary: 'Trip board tiles',
    description:
      'Active, in flight, confirmed or booked, completed and cancelled counts. Revenue and profit are summed from computed totals (never stored) and only for callers with VIEW_MONEY; `profitTripCount` says how many trips had a known operator cost. `paymentAttention` is null until Receivables (#16) exists.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.trips.stats(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one trip',
    description:
      'Legs, named passengers (passport numbers included — whoever may read the trip may read its manifest), the quote and request it came from, and the computed money. Archived trips load too. Outside the caller\'s scope: 404, never 403.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.TRIPS, Action.CREATE)
  @ApiOperation({
    summary: 'Book a trip by hand',
    description:
      'Legs must fit the type (one-way 1, round trip 2, multi-leg 2+), no leg may start and end at the same airport, and days may not go backwards. Created as DRAFT, BOOKED or CONFIRMED only. Linking a trip request converts it. A broker may only assign the trip to themselves.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTripDto) {
    return this.trips.create(user, body);
  }

  @Post('from-quote/:quoteId')
  @RequireAccess(Module.TRIPS, Action.CREATE)
  @ApiOperation({
    summary: 'Book an approved quote',
    description:
      'Copies the quote\'s client, broker, operator, aircraft, route (a return date makes it a round trip), party and priced inputs. Only an **approved** quote can be booked, and only once — a second booking is a 409 naming the first. Converts the quote\'s trip request.',
  })
  bookFromQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() body: BookQuoteDto,
  ) {
    return this.trips.bookFromQuote(user, quoteId, body);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.TRIPS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive several trips', description: 'Requires ARCHIVE permission. Ids that match nothing come back in `skipped`.' })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.trips.removeMany(user, body.ids);
  }

  @Post('bulk-restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.TRIPS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore several archived trips', description: 'Requires ARCHIVE permission.' })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() body: BulkIdsDto) {
    return this.trips.restoreMany(user, body.ids);
  }

  @Patch(':id')
  @RequireAccess(Module.TRIPS, Action.EDIT)
  @ApiOperation({
    summary: 'Edit a trip',
    description:
      '`legs` and `passengers`, when sent, are the complete lists: send each existing row\'s `id` to keep it; rows left out are archived, never deleted. A completed or cancelled trip must be moved back a step first. Only links that change are re-validated. Reassigning is an administrator\'s call.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTripDto,
  ) {
    return this.trips.update(user, id, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.TRIPS, Action.EDIT)
  @ApiOperation({
    summary: 'Move a trip along its lifecycle',
    description:
      'DRAFT → BOOKED → CONFIRMED → IN_FLIGHT → COMPLETED, each undoable one step; CANCELLED from anywhere before departure; a cancelled trip reopens as DRAFT. A disallowed move is a 400 naming the allowed ones. The note lands in the audit trail.',
  })
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeTripStatusDto,
  ) {
    return this.trips.changeStatus(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAccess(Module.TRIPS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Archive a trip', description: 'Requires ARCHIVE permission. Nothing is deleted; restore brings it back.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.trips.remove(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.TRIPS, Action.ARCHIVE)
  @ApiOperation({ summary: 'Restore an archived trip', description: 'Requires ARCHIVE permission. Clears the archive stamp and nothing else.' })
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.restore(user, id);
  }
}
