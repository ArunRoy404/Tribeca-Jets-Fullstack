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
import { RequireAccess, StaffOnly } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { AircraftService } from './aircraft.service.js';
import {
  CreateAircraftDto,
  QueryAircraftDto,
  UpdateAircraftDto,
} from './dto/aircraft.dto.js';

/**
 * **Reads need only a staff session; every write needs the caller's own
 * Aircraft permission** (AGENTS.md, "Reads are open to every signed-in
 * user") — sourcing, quotes, trips and empty legs all pick an aircraft.
 *
 * `@StaffOnly`: a referral agent never picks an aircraft, and fleet
 * specifications, maintenance dates and utilization are desk data, so the
 * partner is refused as with operators.
 */
@ApiTags('Aircraft')
@StaffOnly()
@Controller('aircraft')
export class AircraftController {
  constructor(private readonly aircraft: AircraftService) {}

  @Get()
  @ApiOperation({
    summary: 'List aircraft',
    description:
      'Shared master data — the same rows for every signed-in caller. Paginated, searchable across tail number, model, manufacturer, operator name and home base, and filterable by status, category, operator and home base. Also the fleet finder (scope §6.8): `minPassengers`, `minRangeNm` and `amenities` answer "what can carry nine people to Aspen with a galley".',
  })
  findAll(@Query() query: QueryAircraftDto) {
    return this.aircraft.findAll(query);
  }

  /** Before `:id` — Nest matches in order and would otherwise read it as an id. */
  @Get('stats')
  @ApiOperation({ summary: 'Counts for the tiles above the aircraft table' })
  stats() {
    return this.aircraft.stats();
  }

  /** Also before `:id`, for the same reason. */
  @Get('amenities')
  @ApiOperation({
    summary: 'Distinct cabin features, for the preference filter',
    description:
      'Derived from the stored rows so the filter can never offer a feature nothing matches, or omit one that was just added. De-duplicated case-insensitively — "WiFi" and "Wifi" are one preference typed twice.',
  })
  amenities() {
    return this.aircraft.amenities();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one aircraft',
    description:
      'Includes an empty `tripHistory` array: the detail page has a Trips tab and the module that fills it does not exist yet. `totalTrips`, `tripsThisYear` and `avgUtilization` are null for the same reason — null, not 0, so the page can show an em dash rather than claim the aircraft has never flown.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.aircraft.findOne(id);
  }

  @Post()
  @RequireAccess(Module.AIRCRAFT, Action.CREATE)
  @ApiOperation({
    summary: 'Add an aircraft',
    description:
      'Tail number, model and category are required; the specification sheet is not. A tail number already in use returns 409, and one held by an archived aircraft says so and points at the restore endpoint.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAircraftDto,
  ) {
    return this.aircraft.create(user, dto);
  }

  @Patch(':id')
  @RequireAccess(Module.AIRCRAFT, Action.EDIT)
  @ApiOperation({
    summary: 'Update an aircraft',
    description:
      'Also how an aircraft is put into or taken out of maintenance — the detail page\'s Set Maintenance button sends `status`, so grounding a tail is an ordinary field change and lands in the audit log as one.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAircraftDto,
  ) {
    return this.aircraft.update(user, id, dto);
  }

  /**
   * Declared before `:id` for the same reason `stats` is: Nest matches routes
   * in order, and a literal segment registered after a parameterised one is
   * swallowed by it.
   *
   * POST rather than DELETE-with-body: request bodies on DELETE are poorly
   * supported by proxies and HTTP clients alike, and silently dropped bodies
   * would turn "remove these three" into "remove nothing" with a 200.
   */
  @Post('bulk-delete')
  @RequireAccess(Module.AIRCRAFT, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several aircraft at once (soft)',
    description:
      "For the table's checkbox column. Ids that match nothing are reported as `skipped` rather than failing the batch, so two people clearing the same rows both succeed.",
  })
  removeMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkIdsDto) {
    return this.aircraft.removeMany(user, dto.ids);
  }

  /**
   * Also declared before `:id`, and POST for the same reason as bulk-delete.
   */
  @Post('bulk-restore')
  @RequireAccess(Module.AIRCRAFT, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived aircraft at once',
    description:
      "For the Archived tab's checkbox column. Ids that are not archived are reported as `skipped` rather than failing the batch, so two people restoring the same selection both succeed.",
  })
  restoreMany(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkIdsDto) {
    return this.aircraft.restoreMany(user, dto.ids);
  }

  /**
   * 200, not the 201 that Nest gives a POST by default: a restore
   * creates nothing. It clears a deletion stamp on a row that has
   * existed all along, and every other module's restore says the same.
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.AIRCRAFT, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Restore an archived aircraft',
    description:
      'Clears the deletion stamp and nothing else, so every field comes back untouched — including the tail number, which stayed reserved while the row was archived. A row that is not archived returns 404.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aircraft.restore(user, id);
  }

  @Delete(':id')
  @RequireAccess(Module.AIRCRAFT, Action.ARCHIVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an aircraft (soft)',
    description:
      'The row is kept: quotes and trips will reference it, and destroying it would orphan the history of every flight it flew. This is not how an aircraft leaves a fleet in normal use — set `status` to INACTIVE for that, which keeps the tail listed and searchable.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aircraft.remove(user, id);
  }
}
