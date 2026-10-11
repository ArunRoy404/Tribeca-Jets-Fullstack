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
import { OperatorsService } from './operators.service.js';
import {
  CreateOperatorDto,
  QueryOperatorsDto,
  UpdateOperatorDto,
} from './dto/operator.dto.js';

/**
 * **Reads need only a staff session; every write needs the caller's own
 * Operators permission** (AGENTS.md, "Reads are open to every signed-in
 * user") — aircraft, sourcing, quotes, trips, empty legs and payments all
 * pick an operator.
 *
 * `@StaffOnly`: a referral agent never picks an operator, and an operator's
 * contacts, terms and payment totals are desk data, so the partner is
 * refused as before.
 */
@ApiTags('Operators')
@StaffOnly()
@Controller('operators')
export class OperatorsController {
  constructor(private readonly operators: OperatorsService) {}

  @Get()
  @ApiOperation({
    summary: 'List charter operators',
    description:
      'Shared master data — the same rows for every signed-in caller. Paginated, searchable across name, home base and contacts.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryOperatorsDto) {
    return this.operators.findAll(user, query);
  }

  /** Before `:id` — Nest matches in order and would otherwise read it as an id. */
  @Get('stats')
  @ApiOperation({ summary: 'Counts for the tiles above the operators table' })
  stats() {
    return this.operators.stats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one operator',
    description:
      '`fleet` carries the operator\'s real airframes, with `fleetSize`; `totalTrips` counts their trips; `totalPaid` is every live payment sent to them (Operator Payments) — null for a caller who does not see every operator bill. Trip history and payments are paged from `GET /trips?operatorId=` and `GET /operator-payments?operatorId=`.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.operators.findOne(user, id);
  }

  @Post()
  @RequireAccess(Module.OPERATORS, Action.CREATE)
  @ApiOperation({ summary: 'Add an operator' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOperatorDto,
  ) {
    return this.operators.create(user, dto);
  }

  @Patch(':id')
  @RequireAccess(Module.OPERATORS, Action.EDIT)
  @ApiOperation({ summary: 'Update an operator' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperatorDto,
  ) {
    return this.operators.update(user, id, dto);
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
  @RequireAccess(Module.OPERATORS, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove several operators at once (soft)',
    description:
      'For the table\'s checkbox column. Ids that match nothing are reported as `skipped` rather than failing the batch, so two people clearing the same rows both succeed.',
  })
  removeMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.operators.removeMany(user, dto.ids);
  }

  /**
   * Also declared before `:id`, and POST for the same reason as bulk-delete.
   */
  @Post('bulk-restore')
  @RequireAccess(Module.OPERATORS, Action.ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore several archived operators at once',
    description:
      "For the Archived tab's checkbox column. Ids that are not archived are reported as `skipped` rather than failing the batch, so two people restoring the same selection both succeed.",
  })
  restoreMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ) {
    return this.operators.restoreMany(user, dto.ids);
  }

  /**
   * 200, not the 201 that Nest gives a POST by default: a restore
   * creates nothing. It clears a deletion stamp on a row that has
   * existed all along, and every other module's restore says the same.
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.OPERATORS, Action.ARCHIVE)
  @ApiOperation({
    summary: 'Restore an archived operator',
    description:
      'Clears the deletion stamp and nothing else, so every field comes back untouched. Requires Operators · Archive, the same as removing it. A row that is not archived returns 404.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operators.restore(user, id);
  }

  @Delete(':id')
  @RequireAccess(Module.OPERATORS, Action.ARCHIVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an operator (soft)',
    description:
      'The row is kept: trips, quotes and payments will reference it, and destroying it would orphan the history of every flight it operated.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operators.remove(user, id);
  }
}
