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
  RequirePermissions,
  RequireWritePermissions,
} from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { TripRequestsService } from './trip-requests.service.js';
import {
  CreateTripRequestDto,
  QueryTripRequestsDto,
  UpdateTripRequestDto,
} from './dto/trip-request.dto.js';

/**
 * Open trip requests — the enquiry, before it becomes a quote or a trip
 * (scope §6.4).
 *
 * Uses the trips permissions rather than a new pair, because a request *is*
 * the start of a trip: `VIEW_TRIPS` to read, `MANAGE_TRIPS` to write, and
 * `DELETE_TRIPS` (administrators only) to archive. Brokers hold the first two
 * at OWN scope, which the service turns into a row-level filter.
 */
@ApiTags('Trip Requests')
@Controller('trip-requests')
export class TripRequestsController {
  constructor(private readonly requests: TripRequestsService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'List trip requests',
    description:
      'Scoped: a broker sees the enquiries assigned to them plus any not yet assigned to anyone — an unowned request is exactly the one that must not disappear. Use `openOnly=true` for the working board, which hides requests that converted or were lost.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTripRequestsDto,
  ) {
    return this.requests.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order and would read it as an id. */
  @Get('stats')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Counts and pipeline value for the tiles above the board',
    description:
      'Scoped like the list, so a broker\'s tiles always agree with the rows underneath them. `pipelineValue` sums only open requests — a converted one belongs to the trip it became, and counting it here would double it.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.requests.stats(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_TRIPS)
  @ApiOperation({
    summary: 'Get one trip request',
    description:
      'Archived rows load here too, so the Archived tab can link to them. A request outside the caller\'s scope returns 404 rather than 403 — a 403 confirms the record exists and turns any id into an oracle.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requests.findOne(user, id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'File a trip request',
    description:
      'Only `clientId` is required — everything else can arrive later, and demanding a full route on a first phone call only produces guesses. A broker files against themselves; assigning to someone else needs a wider scope.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTripRequestDto,
  ) {
    return this.requests.create(user, dto);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Update a trip request',
    description:
      'Also how a request moves through the pipeline — send `status`. Reassignment is an administrator action.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripRequestDto,
  ) {
    return this.requests.update(user, id, dto);
  }

  /** Declared before `:id`, and POST because proxies drop DELETE bodies. */
  @Post('bulk-delete')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several trip requests at once (soft)',
    description:
      'Administrators only. Ids that match nothing are reported as `skipped` rather than failing the batch.',
  })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkIdsDto) {
    return this.requests.removeMany(user, dto.ids);
  }

  @Post('bulk-restore')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived trip requests at once',
    description:
      "For the Archived tab's checkbox column. Ids that are not archived are reported as `skipped`.",
  })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkIdsDto) {
    return this.requests.restoreMany(user, dto.ids);
  }

  /**
   * 200, not the 201 Nest gives a POST: a restore creates nothing. It clears a
   * deletion stamp on a row that has existed all along.
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @ApiOperation({
    summary: 'Restore an archived trip request',
    description:
      'Administrators only, like removing it. Clears the deletion stamp and nothing else.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requests.restore(user, id);
  }

  @Delete(':id')
  @RequireWritePermissions(Permission.MANAGE_TRIPS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a trip request (soft)',
    description:
      'Administrators only. A broker who has stopped working an enquiry sets its status to LOST, which keeps it in the pipeline history and in the conversion figures — removing the row quietly improves everyone\'s conversion rate, which is the wrong incentive to build into a sales tool.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requests.remove(user, id);
  }
}
