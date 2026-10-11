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
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { BulkIdsDto } from '../../common/dto/bulk.dto.js';
import { AirportsService } from './airports.service.js';
import {
  CreateAirportDto,
  QueryAirportsDto,
  UpdateAirportDto,
} from './dto/airport.dto.js';

/**
 * **Reads need only a session; every write needs its Airports permission**
 * (owner's rule, 8 Oct 2026 — AGENTS.md, "Reads are open to every signed-in
 * user").
 *
 * The four GETs carry no permission on purpose: about eight forms pick an
 * airport — clients, aircraft, trip requests, trips, quotes, empty legs,
 * leads, the instant estimate and the referral portal — and an airport is
 * reference data with no owner. Whether someone may open the *Airports
 * screen* is the frontend's `AIRPORTS · VIEW`; whether they may change a row
 * is checked here, per person, on every write.
 */
@ApiTags('Airports')
@Controller('airports')
export class AirportsController {
  constructor(private readonly airports: AirportsService) {}

  @Get()
  @ApiOperation({
    summary: 'List airports',
    description:
      'Shared reference data — every signed-in caller sees the same rows. Paginated, searchable across ICAO, IATA, name, city and country.',
  })
  findAll(@Query() query: QueryAirportsDto) {
    return this.airports.findAll(query);
  }

  /**
   * Declared before `:id` on purpose. Nest matches routes in order, so a
   * literal path registered after a parameterised one would be swallowed by it
   * and arrive as `findOne('stats')`.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Counts for the tiles above the airports table' })
  stats() {
    return this.airports.stats();
  }

  @Get('countries')
  @ApiOperation({
    summary: 'Distinct countries, for the filter dropdown',
    description:
      'Derived from the stored rows so the filter can never offer a country nothing matches, or omit one that was just added.',
  })
  countries() {
    return this.airports.countries();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one airport',
    description:
      'Archived airports included, so the Archived tab can open them. `trips` counts live, uncancelled trips with a leg departing from or arriving here (`total`, and `thisYear` by departure date); it is `null` for a referral agent.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.airports.findOne(id, user);
  }

  @Post()
  @RequireAccess(Module.AIRPORTS, Action.CREATE)
  @ApiOperation({ summary: 'Add an airport' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAirportDto,
  ) {
    return this.airports.create(user, dto);
  }

  @Patch(':id')
  @RequireAccess(Module.AIRPORTS, Action.EDIT)
  @ApiOperation({ summary: 'Update an airport' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAirportDto,
  ) {
    return this.airports.update(user, id, dto);
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
  @RequireAccess(Module.AIRPORTS, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several airports at once (soft)',
    description:
      'For the table\'s checkbox column. Ids that match nothing are reported as `skipped` rather than failing the batch, so two people clearing the same rows both succeed.',
  })
  removeMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.airports.removeMany(user, dto.ids);
  }

  /**
   * Also declared before `:id`, and POST for the same reason as bulk-delete.
   */
  @Post('bulk-restore')
  @RequireAccess(Module.AIRPORTS, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived airports at once',
    description:
      "For the Archived tab's checkbox column. Ids that are not archived are reported as `skipped` rather than failing the batch, so two people restoring the same selection both succeed.",
  })
  restoreMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.airports.restoreMany(user, dto.ids);
  }

  /**
   * 200, not the 201 that Nest gives a POST by default: a restore
   * creates nothing. It clears a deletion stamp on a row that has
   * existed all along, and every other module's restore says the same.
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.AIRPORTS, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Restore an archived airport',
    description:
      'Clears the deletion stamp and nothing else, so every field comes back untouched. Requires Airports · Archive, the same as removing it. A row that is not archived returns 404.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.airports.restore(user, id);
  }

  @Delete(':id')
  @RequireAccess(Module.AIRPORTS, Action.ARCHIVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an airport (soft)',
    description: 'The row is kept: trips and itineraries will reference it.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.airports.remove(user, id);
  }
}
