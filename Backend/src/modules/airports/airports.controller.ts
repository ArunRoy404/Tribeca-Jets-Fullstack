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
import { AirportsService } from './airports.service.js';
import {
  CreateAirportDto,
  QueryAirportsDto,
  UpdateAirportDto,
} from './dto/airport.dto.js';

/**
 * Reads use `@RequirePermissions`, writes use `@RequireWritePermissions`.
 *
 * The difference matters here: brokers and assistants hold MANAGE_AIRPORTS at
 * READ scope, which is a grant for the four GETs and a refusal for everything
 * below them. `@RequirePermissions` alone on a POST would let them through.
 */
@ApiTags('Airports')
@Controller('airports')
export class AirportsController {
  constructor(private readonly airports: AirportsService) {}

  @Get()
  @RequirePermissions(Permission.MANAGE_AIRPORTS)
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
  @RequirePermissions(Permission.MANAGE_AIRPORTS)
  @ApiOperation({ summary: 'Counts for the tiles above the airports table' })
  stats() {
    return this.airports.stats();
  }

  @Get('countries')
  @RequirePermissions(Permission.MANAGE_AIRPORTS)
  @ApiOperation({
    summary: 'Distinct countries, for the filter dropdown',
    description:
      'Derived from the stored rows so the filter can never offer a country nothing matches, or omit one that was just added.',
  })
  countries() {
    return this.airports.countries();
  }

  @Get(':id')
  @RequirePermissions(Permission.MANAGE_AIRPORTS)
  @ApiOperation({ summary: 'Get one airport' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.airports.findOne(id);
  }

  @Post()
  @RequireWritePermissions(Permission.MANAGE_AIRPORTS)
  @ApiOperation({ summary: 'Add an airport' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAirportDto,
  ) {
    return this.airports.create(user, dto);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_AIRPORTS)
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
  @RequireWritePermissions(Permission.MANAGE_AIRPORTS)
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
  @RequireWritePermissions(Permission.MANAGE_AIRPORTS)
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

  @Post(':id/restore')
  @RequireWritePermissions(Permission.MANAGE_AIRPORTS)
  @ApiOperation({
    summary: 'Restore an archived airport',
    description:
      'Clears the deletion stamp and nothing else, so every field comes back untouched. Requires the same write permission as removing it. A row that is not archived returns 404.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.airports.restore(user, id);
  }

  @Delete(':id')
  @RequireWritePermissions(Permission.MANAGE_AIRPORTS)
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
